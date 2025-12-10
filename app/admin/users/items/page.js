'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Tag, DollarSign, Search } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function ItemManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
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

  async function handleCreateItem(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newItem = {
      sku: formData.get('sku'),
      name: formData.get('name'),
      price: parseFloat(formData.get('price'))
    };

    const { error } = await supabase.from('items').insert([newItem]);
    if (error) alert(error.message);
    else { setShowModal(false); fetchItems(); }
  }

  async function deleteItem(id) {
    if(!confirm("Delete this item? It will not affect existing orders.")) return;
    await supabase.from('items').delete().eq('id', id);
    fetchItems();
  }

  const filteredItems = items.filter(i => 
    i.sku.toLowerCase().includes(search.toLowerCase()) || 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return <div className="p-10">Checking permissions...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Tag className="text-[#0176D3]"/> Master Items Database
                </h1>
                <button onClick={() => setShowModal(true)} className="bg-[#0176D3] text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center gap-2">
                    <Plus size={16}/> Add New Item
                </button>
            </div>

            <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-sm outline-none focus:border-[#0176D3]" placeholder="Search SKU or Name..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th className="px-6 py-4 w-32">SKU</th>
                            <th className="px-6 py-4">Item Name / Description</th>
                            <th className="px-6 py-4 w-32">Price (Unit)</th>
                            <th className="px-6 py-4 w-20 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-700">{item.sku}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{item.name}</td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-800">${item.price.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
       </main>

       {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">Add Master Item</h3>
                <form onSubmit={handleCreateItem} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SKU Code</label>
                        <input name="sku" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Description</label>
                        <input name="name" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price per Unit ($)</label>
                        <input name="price" type="number" step="0.01" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" required />
                    </div>
                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#0176D3] hover:bg-blue-700 rounded">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}