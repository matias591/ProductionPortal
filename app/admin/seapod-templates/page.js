'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Cpu, ChevronRight, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Sidebar from '../../components/Sidebar';

// --- NEW SORTABLE ROW COMPONENT ---
function SortableTemplateRow({ template, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: template.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="p-4 flex justify-between items-center bg-white border-b border-slate-100 hover:bg-slate-50 group">
        <div className="flex items-center gap-4">
            <div {...attributes} {...listeners} className="text-slate-300 cursor-grab hover:text-slate-600">
                <GripVertical size={20} />
            </div>
            <div onClick={onClick} className="cursor-pointer">
                <div className="font-bold text-slate-700">{template.name}</div>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                    <span className="bg-slate-100 px-1.5 rounded border font-medium text-slate-600">Ver: {template.seapod_version || 'N/A'}</span>
                    <span className="bg-slate-50 px-1.5 rounded border">HW: {template.hw_version || 'N/A'}</span>
                    <span className="bg-slate-50 px-1.5 rounded border">SW: {template.sw_version || 'N/A'}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <span onClick={onClick} className="cursor-pointer text-xs font-bold text-[#0176D3] flex items-center gap-1 group-hover:underline">Edit Items <ChevronRight size={14}/></span>
            {/* Z-index to ensure click registers over drag layer */}
            <button onClick={(e) => { e.stopPropagation(); onDelete(template.id); }} className="text-slate-300 hover:text-red-500 z-10 relative"><Trash2 size={16}/></button>
        </div>
    </div>
  );
}


export default function SeapodTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    // --- FETCH ORDERED BY SORT_ORDER ---
    const { data } = await supabase.from('seapod_templates').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    setTemplates(data || []);
  }

  async function createTemplate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Calculate new sort order
    const nextOrder = templates.length > 0 ? Math.max(...templates.map(t => t.sort_order || 0)) + 1 : 1;

    const newTemplate = {
        name: formData.get('name'),
        seapod_version: formData.get('seapod_version'),
        hw_version: formData.get('hw'),
        sw_version: formData.get('sw'),
        sort_order: nextOrder
    };

    const { error } = await supabase.from('seapod_templates').insert([newTemplate]);
    if(error) alert(error.message);
    else {
        setShowModal(false);
        fetchTemplates();
    }
  }

  async function deleteTemplate(id) {
    if(confirm("Delete this template?")) {
      await supabase.from('seapod_templates').delete().eq('id', id);
      fetchTemplates();
    }
  }

  // --- DRAG END HANDLER ---
  async function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setTemplates((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const reorderedList = arrayMove(items, oldIndex, newIndex);

        reorderedList.forEach(async (item, index) => {
            item.sort_order = index + 1;
            await supabase.from('seapod_templates').update({ sort_order: index + 1 }).eq('id', item.id);
        });

        return reorderedList;
      });
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Cpu className="text-[#0176D3]"/> Seapod Templates
                </h1>
                <button onClick={() => setShowModal(true)} className="bg-[#0176D3] text-white px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2">
                    <Plus size={16}/> New Template
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* --- DRAG CONTEXT WRAPPER --- */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <div className="divide-y divide-slate-100">
                            {templates.map(t => (
                                <SortableTemplateRow 
                                    key={t.id} 
                                    template={t} 
                                    onClick={() => router.push(`/admin/seapod-templates/${t.id}`)}
                                    onDelete={deleteTemplate}
                                />
                            ))}
                            {templates.length === 0 && <div className="p-8 text-center text-slate-400">No templates found.</div>}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
         </div>
       </main>
       
       {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">New Seapod Recipe</h3>
                <form onSubmit={createTemplate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template Name</label>
                        <input name="name" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="e.g. Standard Seapod V3" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seapod Version</label>
                        <input name="seapod_version" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="e.g. Generation 3.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HW Version</label>
                            <input name="hw" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="v1.0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SW Version</label>
                            <input name="sw" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="v2.4.1" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold hover:bg-blue-700">Create</button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}