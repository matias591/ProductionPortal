'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Sidebar from '../../../components/Sidebar';

// Sortable Row
function SortableItem({ item, onDelete, onUpdate, masterItems }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center px-4 py-3 bg-white border-b border-slate-100 hover:bg-slate-50 group gap-4">
      <div {...attributes} {...listeners} className="text-slate-300 cursor-grab hover:text-slate-600"><GripVertical size={20} /></div>
      <select 
        className="flex-1 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
        value={item.item_id || ''}
        onChange={(e) => onUpdate(item.id, 'item_id', e.target.value)}
      >
        <option value="">Select Master Item...</option>
        {masterItems.map(m => <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>)}
      </select>
      <input 
        type="number"
        className="w-20 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
        value={item.quantity || 1}
        onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
      />
      <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
    </div>
  );
}

export default function SeapodTemplateDetails({ params }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(null);
  const [items, setItems] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [tplName, setTplName] = useState('');
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { Promise.resolve(params).then(res => setTemplateId(res.id)); }, [params]);
  useEffect(() => { if(templateId) fetchData(); }, [templateId]);

  async function fetchData() {
    const { data: t } = await supabase.from('seapod_templates').select('name').eq('id', templateId).single();
    const { data: i } = await supabase.from('seapod_template_items').select('*').eq('template_id', templateId).order('sort_order', { ascending: true });
    const { data: m } = await supabase.from('items').select('*').order('name');
    if(t) setTplName(t.name);
    setItems(i || []);
    setMasterItems(m || []);
  }

  async function addItem() {
    const firstMaster = masterItems[0];
    if (!firstMaster) return alert("Create Master Items first!");
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;
    const newItem = { template_id: templateId, piece: firstMaster.name, item_id: firstMaster.id, quantity: 1, sort_order: nextOrder };
    const { data } = await supabase.from('seapod_template_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function updateItem(id, field, value) {
    let updateData = { [field]: value };
    if (field === 'item_id') {
        const selectedMaster = masterItems.find(m => m.id === value);
        updateData = { item_id: value, piece: selectedMaster.name };
    }
    setItems(items.map(i => i.id === id ? { ...i, ...updateData } : i));
    await supabase.from('seapod_template_items').update(updateData).eq('id', id);
  }

  async function deleteItem(id) {
    setItems(items.filter(i => i.id !== id));
    await supabase.from('seapod_template_items').delete().eq('id', id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reorderedList = arrayMove(items, oldIndex, newIndex);
        reorderedList.forEach(async (item, index) => {
            item.sort_order = index + 1;
            await supabase.from('seapod_template_items').update({ sort_order: index + 1 }).eq('id', item.id);
        });
        return reorderedList;
      });
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => router.push('/admin/seapod-templates')} className="text-xs font-bold text-slate-500 hover:text-black mb-6 flex items-center gap-2"><ArrowLeft size={14}/> Back</button>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[#0176D3] shadow-sm"><Cpu size={24}/></div>
                    <div><h1 className="text-2xl font-bold text-slate-900">{tplName}</h1><p className="text-sm text-slate-500">Define recipe items.</p></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-14 py-3 bg-slate-50 border-b border-slate-200 flex justify-between"><span className="text-xs font-bold text-slate-500 uppercase">Item Selection</span><span className="text-xs font-bold text-slate-500 uppercase mr-12">Qty</span></div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="divide-y divide-slate-100">{items.map(item => (<SortableItem key={item.id} item={item} onDelete={deleteItem} onUpdate={updateItem} masterItems={masterItems}/>))}</div>
                        </SortableContext>
                    </DndContext>
                    <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:text-[#0176D3] border-t border-slate-200 flex items-center justify-center gap-2"><Plus size={16}/> Add Item</button>
                </div>
            </div>
        </main>
    </div>
  );
}