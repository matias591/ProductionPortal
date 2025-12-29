'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Tag, Search, Pencil, X, AlertTriangle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function ItemManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // If null, we are creating. If set, we are editing.

  const [search, setSearch] = useState('');
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') { alert("Access Denied"); router.push('/'); } 
    else setIsAdmin(true);
  }

  async function fetchItems() {
    const { data } = await supabase.from('items').select('*').order('sku');
    setItems(data || []);
    setLoading(false);
  }

  // --- OPEN MODAL (CREATE) ---
  function openCreateModal() {
    setEditingItem(null); // Clear editing state
    setShowModal(true);
  }

  // --- OPEN MODAL (EDIT) ---
  function openEditModal(item) {
    setEditingItem(item); // Load item data
    setShowModal(true);
  }

  // --- SAVE (HANDLE BOTH CREATE AND UPDATE) ---
  async function handleSaveItem(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const itemData = {
      sku: formData.get('sku'),
      name: formData.get('name'),
      price: parseFloat(formData.get('price')) || 0
    };

    let error;

    if (editingItem) {
        // UPDATE Existing
        const { error: updateError } = await supabase
            .from('items')
            .update(itemData)
            .eq('id', editingItem.id);
        error = updateError;
    } else {
        // INSERT New
        const { error: insertError } = await supabase
            .from('items')
            .insert([itemData]);
        error = insertError;
    }

    if (error) {
        alert("Error saving item: " + error.message);
    } else {
        setShowModal(false);
        fetchItems(); // Refresh list
    }
  }

  // --- DELETE LOGIC (Fixed) ---
  async function deleteItem(id) {
    if(!confirm("Are you sure you want to delete this item?")) return;
    
    // 1. Optimistic Update (Remove from UI immediately for speed)
    const originalItems = [...items];
    setItems(items.filter(i => i.id !== id));

    // 2. Database Delete
    const { error } = await supabase.from('items').delete().eq('id', id);

    // 3. Handle Error (e.g., Item is used in a Kit or Order)
    if (error) {
        console.error("Delete failed:", error);
        // Revert UI
        setItems(originalItems);
        
        if (error.code === '23503') { // Foreign Key Violation code
            alert("⚠️ Cannot delete this item because it is currently used in a Kit or an existing Order.\n\nPlease remove it from Kits/Orders first.");
        } else {
            alert("Delete failed: " + error.message);
        }
    }
  }

  const filteredItems = items.filter(i => 
    i.sku.toLowerCase().includes(search.toLowerCase()) || 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><div className="ml-64 p-10 text-slate-500">Checking permissions...</div></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Tag className="text-[#0176D3]"/> Master Items Database
                </h1>
                <button onClick={openCreateModal} className="bg-[#0176D3] text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
                    <Plus size={16}/> Add New Item
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-sm outline-none focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] transition-all" 
                        placeholder="Search SKU or Name..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th className="px-6 py-4 w-40">SKU</th>
                            <th className="px-6 py-4">Item Name / Description</th>
                            <th className="px-6 py-4 w-32">Price (Unit)</th>
                            <th className="px-6 py-4 w-32 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-blue-50/50 group transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{item.sku}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.name}</td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-800">${item.price?.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    
                                    {/* Edit Button */}
                                    <button 
                                        onClick={() => openEditModal(item)} 
                                        className="p-2 text-slate-400 hover:text-[#0176D3] hover:bg-blue-50 rounded transition-all"
                                        title="Edit Item"
                                    >
                                        <Pencil size={16}/>
                                    </button>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={() => deleteItem(item.id)} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                        title="Delete Item"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
         </div>
       </main>

       {/* CREATE / EDIT MODAL */}
       {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">
                        {editingItem ? 'Edit Item' : 'Add Master Item'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                        <X size={20}/>
                    </button>
                </div>
                
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU Code</label>
                        <input 
                            name="sku" 
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" 
                            required 
                            defaultValue={editingItem?.sku || ''}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Description</label>
                        <input 
                            name="name" 
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" 
                            required 
                            defaultValue={editingItem?.name || ''}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price per Unit ($)</label>
                        <input 
                            name="price" 
                            type="number" 
                            step="0.01" 
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" 
                            required 
                            defaultValue={editingItem?.price || ''}
                        />
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded border border-slate-200">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#0176D3] hover:bg-blue-700 rounded shadow-sm">
                            {editingItem ? 'Save Changes' : 'Create Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}