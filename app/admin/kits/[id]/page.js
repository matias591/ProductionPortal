'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Package, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- SORTABLE ITEM COMPONENT ---
function SortableItem({ item, onDelete, onUpdate, masterItems }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center px-4 py-3 bg-white border-b border-slate-100 hover:bg-slate-50 group gap-4">
      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="text-slate-300 cursor-grab hover:text-slate-600">
        <GripVertical size={20} />
      </div>

      {/* Item Dropdown */}
      <select 
        className="flex-1 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
        value={item.item_id || ''}
        onChange={(e) => onUpdate(item.id, 'item_id', e.target.value)}
      >
        <option value="">Select Item...</option>
        {masterItems.map(m => (
            <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>
        ))}
      </select>

      {/* Quantity */}
      <input 
        type="number"
        className="w-20 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
        value={item.quantity || 1}
        onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
      />

      {/* Delete */}
      <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={16}/>
      </button>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function KitDetails({ params }) {
  const unwrappedParams = use(params);
  const kitId = unwrappedParams.id;
  const router = useRouter();
  
  const [items, setItems] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [kitName, setKitName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: kit } = await supabase.from('kits').select('name').eq('id', kitId).single();
    // ORDER BY SORT_ORDER
    const { data: kitItems } = await supabase.from('kit_items').select('*').eq('kit_id', kitId).order('sort_order', { ascending: true });
    const { data: allItems } = await supabase.from('items').select('*').order('name');
    
    if (kit) setKitName(kit.name);
    setItems(kitItems || []);
    setMasterItems(allItems || []);
  }

  async function addItem() {
    const firstMaster = masterItems[0];
    if (!firstMaster) return alert("Create Master Items first!");

    // Set sort_order to be the last one
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;

    const newItem = { 
        kit_id: kitId, 
        piece: firstMaster.name, 
        item_id: firstMaster.id, 
        quantity: 1,
        sort_order: nextOrder 
    };
    const { data } = await supabase.from('kit_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function updateItem(id, field, value) {
    let updateData = { [field]: value };
    if (field === 'item_id') {
        const selectedMaster = masterItems.find(m => m.id === value);
        updateData = { item_id: value, piece: selectedMaster.name };
    }
    const newItems = items.map(i => i.id === id ? { ...i, ...updateData } : i);
    setItems(newItems);
    await supabase.from('kit_items').update(updateData).eq('id', id);
  }

  async function deleteItem(id) {
    setItems(items.filter(i => i.id !== id));
    await supabase.from('kit_items').delete().eq('id', id);
  }

  // --- DRAG END HANDLER ---
  async function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const reorderedList = arrayMove(items, oldIndex, newIndex);

        // Update DB with new order
        reorderedList.forEach(async (item, index) => {
            // Optimistic update
            item.sort_order = index + 1;
            // Background update
            await supabase.from('kit_items').update({ sort_order: index + 1 }).eq('id', item.id);
        });

        return reorderedList;
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
        <div className="max-w-3xl mx-auto">
            <button onClick={() => router.push('/admin/kits')} className="text-xs font-bold text-slate-500 hover:text-black mb-6 flex items-center gap-2">
                <ArrowLeft size={14} /> Back to Kits
            </button>

            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[#0176D3] shadow-sm">
                    <Package size={24}/>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{kitName}</h1>
                    <p className="text-sm text-slate-500">Drag items to reorder priority.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-14 py-3 bg-slate-50 border-b border-slate-200 flex justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Item Selection</span>
                    <span className="text-xs font-bold text-slate-500 uppercase mr-12">Qty</span>
                </div>
                
                {/* DRAG CONTEXT */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="divide-y divide-slate-100">
                            {items.map(item => (
                                <SortableItem 
                                    key={item.id} 
                                    item={item} 
                                    onDelete={deleteItem} 
                                    onUpdate={updateItem} 
                                    masterItems={masterItems}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:text-[#0176D3] border-t border-slate-200 flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50">
                    <Plus size={16}/> Add Line Item
                </button>
            </div>
        </div>
    </div>
  );
}