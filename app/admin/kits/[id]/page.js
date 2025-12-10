'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react';

export default function KitDetails({ params }) {
  const unwrappedParams = use(params);
  const kitId = unwrappedParams.id;
  const router = useRouter();
  
  const [items, setItems] = useState([]);
  const [masterItems, setMasterItems] = useState([]); // <--- Master List
  const [kitName, setKitName] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch Kit & Items
    const { data: kit } = await supabase.from('kits').select('name').eq('id', kitId).single();
    const { data: kitItems } = await supabase.from('kit_items').select('*').eq('kit_id', kitId).order('created_at');
    
    // Fetch Master Items List
    const { data: allItems } = await supabase.from('items').select('*').order('name');
    
    if (kit) setKitName(kit.name);
    setItems(kitItems || []);
    setMasterItems(allItems || []);
  }

  async function addItem() {
    // Default to first master item or placeholder
    const firstMaster = masterItems[0];
    if (!firstMaster) return alert("Please create Master Items first!");

    const newItem = { 
        kit_id: kitId, 
        piece: firstMaster.name, // Fallback name
        item_id: firstMaster.id, // <--- Link to Master
        quantity: 1 
    };
    const { data } = await supabase.from('kit_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function updateItem(id, field, value) {
    let updateData = { [field]: value };

    // If changing the Item selection, update both name and item_id
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
                    <p className="text-sm text-slate-500">Define default items for this kit.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Item Selection</span>
                    <span className="text-xs font-bold text-slate-500 uppercase mr-12">Qty</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center px-6 py-3 hover:bg-slate-50 group gap-4">
                            
                            {/* Dropdown for Items */}
                            <select 
                                className="flex-1 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
                                value={item.item_id || ''}
                                onChange={(e) => updateItem(item.id, 'item_id', e.target.value)}
                            >
                                {masterItems.map(m => (
                                    <option key={m.id} value={m.id}>{m.sku} - {m.name}</option>
                                ))}
                            </select>

                            <input 
                                type="number"
                                className="w-20 bg-transparent border border-transparent hover:border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0176D3] text-sm"
                                value={item.quantity || 1}
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            />
                            <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={addItem} className="w-full py-3 text-sm font-bold text-slate-500 hover:text-[#0176D3] border-t border-slate-200 flex items-center justify-center gap-2">
                    <Plus size={16}/> Add Line Item
                </button>
            </div>
        </div>
    </div>
  );
}