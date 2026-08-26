'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship, Upload, FileText, Paperclip, Lock, Download, Building2, Loader2, Warehouse, Cpu, Check, AlertTriangle, XCircle, User, RefreshCcw } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

const INVOICE_PACKAGES = {
  full_system: {
    label: 'Full system',
    items: [
      { description: 'ORCA AI SYSTEM', hs: '8525.83', unitValue: '$16000', quantity: '1', weight: '165.34', value: '$16000' }
    ]
  },
  seapod_replacement: {
    label: 'Seapod replacement',
    items: [
      { description: 'ORCA AI CAMERA (Made in Israel)', hs: '8525.83', unitValue: '$1500', quantity: '1', weight: '28.66', value: '$1500' }
    ]
  },
  pu_replacement: {
    label: 'PU replacement',
    items: [
      { description: 'ASUS COMPUTER (Made in China)', hs: '847180', unitValue: '$1000', quantity: '1', weight: '19.84', value: '$1000' }
    ]
  },
  monitor_replacement: {
    label: 'Monitor replacement',
    items: [
      { description: 'Atar El - 23.8 Monitor Set', hs: '8531.20', unitValue: '$1500', quantity: '1', weight: '28.66', value: '$1500' }
    ]
  },
  rut_modem: {
    label: 'RUT MODEM 241',
    items: [
      { description: 'RUT MODEM 241 (Made in Lithuania)', hs: '85176230', unitValue: '$100', quantity: '1', weight: '1.1', value: '$100' }
    ]
  },
  spare_parts: {
    label: 'SPARE PARTS: Each one individually',
    items: [
      { description: 'KVM EXTENDER', hs: '8517.62', unitValue: '$20', quantity: '1', weight: '0.551', value: '$20' },
      { description: 'HDMI 10 Meter Cable', hs: '8544.42', unitValue: '$10', quantity: '1', weight: '0.551', value: '$10' },
      { description: 'USB 10 Meter Cable', hs: '8544.42', unitValue: '$10', quantity: '1', weight: '0.551', value: '$10' },
      { description: 'Power Cable Extender', hs: '85444200', unitValue: '$40', quantity: '1', weight: '0.551', value: '$40' }
    ]
  }
};

const SUB_TYPE_OPTIONS = {
  'Full system': ['O3', '360 System'],
  'Upgrade': ['O3', '360 System'],
  'Replacement': ['Monitor', 'PU', 'Seapod', 'Mini 360'],
};

export default function OrderDetails({ params }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(null);

  // --- DATA STATE ---
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PERMISSIONS STATE ---
  const [isAdmin, setIsAdmin] = useState(false); 
  const [canShip, setCanShip] = useState(false);
  const [canEditWarehouse, setCanEditWarehouse] = useState(false);
  const [userEmail, setUserEmail] = useState(''); 

  // --- UI STATE ---
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [shipping, setShipping] = useState(false); 
  const [showShipModal, setShowShipModal] = useState(false);
  const [checkingVessel, setCheckingVessel] = useState(false);

  // --- SEAPOD WIZARD STATE ---
  const [showSeapodModal, setShowSeapodModal] = useState(false);
  const [seapodStep, setSeapodStep] = useState(1); 
  const [missingSeapodSerial, setMissingSeapodSerial] = useState('');
  const [seapodTemplates, setSeapodTemplates] = useState([]);
  const [selectedSeapodTemplate, setSelectedSeapodTemplate] = useState('');
  
  const [newSeapodItems, setNewSeapodItems] = useState([]);
  const [newSeapodId, setNewSeapodId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); 
  const [tplDetails, setTplDetails] = useState(null);

  // --- CONFLICT MODAL STATE ---
  const [showAssignedModal, setShowAssignedModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  // --- INVOICE STATE ---
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ currency: 'USD', termsOfFreight: 'DDP', packages: 1, addressId: '' });
  const [addresses, setAddresses] = useState([]);
  const [addressSearch, setAddressSearch] = useState('');
  const [showAddressList, setShowAddressList] = useState(false);
  const [showAddressCreate, setShowAddressCreate] = useState(false);
  const [newAddress, setNewAddress] = useState({ company_name: '', address: '', phone: '', email: '', pic: '' });
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [packageItems, setPackageItems] = useState([]);
  const [generatePackingList, setGeneratePackingList] = useState('yes');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    Promise.resolve(params).then((r) => setOrderId(r.id));
  }, [params]);

  useEffect(() => {
    if (orderId) fetchData();
  }, [orderId]);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       setUserEmail(session.user.email);
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       if (profile?.role === 'admin') setIsAdmin(true);
       if (['admin', 'operation'].includes(profile?.role)) {
           setCanShip(true);
           setCanEditWarehouse(true);
       }
    }

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    
    const { data: itemData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
    
    const { data: fileData } = await supabase.from('order_files').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
    const { data: allItems } = await supabase.from('items').select('*').order('name');
    
    const { data: tpls } = await supabase.from('seapod_templates').select('*').order('name');
    setSeapodTemplates(tpls || []);
    if (tpls?.length > 0) setSelectedSeapodTemplate(tpls[0].id);

    setOrder(orderData);
    setItems(itemData || []);
    setFiles(fileData || []);
    setMasterItems(allItems || []);
    setLoading(false);
  }

  const isLocked = order?.status === 'Shipped' && !canShip;

  // --- VESSEL CHECK ---
  async function handleVesselBlur() {
    if (isLocked || !canShip || !order.vessel || order.vessel.trim() === '') return;
    setCheckingVessel(true);
    try {
        const res = await fetch('/api/check-vessel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vessel: order.vessel })
        });
        const data = await res.json();
        
        if (data.account && data.account !== "Account Empty") {
            setOrder(prev => ({ ...prev, account_name: data.account }));
            await supabase.from('orders').update({ account_name: data.account }).eq('id', orderId);
        } else {
            alert(`⚠️ Vessel "${order.vessel}" does not exist in Salesforce.`);
            setOrder(prev => ({ ...prev, vessel: '', account_name: '' }));
            await supabase.from('orders').update({ vessel: null, account_name: null }).eq('id', orderId);
        }
    } catch (e) {
        console.error("Vessel Check Failed", e);
    }
    setCheckingVessel(false);
  }

  // --- MANUAL WEBHOOK ---
  async function handleManualWebhook() {
    if (!confirm("Are you sure you want to re-trigger the shipping webhook manually?")) return;
    setShipping(true);
    try {
        const res = await fetch('/api/trigger-shipping', { method: 'POST', body: JSON.stringify({ orderId: orderId }) });
        const json = await res.json();
        if (json.error) alert("Error: " + json.error);
        else alert("Webhook triggered successfully!");
    } catch(e) { alert("Error: " + e.message); }
    setShipping(false);
  }

  // --- UPDATE ORDER LOGIC ---
  async function updateOrder(field, value) {
    if (isLocked) return;

    // 1. UNLINK LOGIC
    const downgradeStatuses = ['New', 'In preparation'];
    if (field === 'status' && downgradeStatuses.includes(value)) {
        if (['In Box', 'Ready for Pickup', 'Shipped'].includes(order.status)) {
             const { data: assignedSeapod } = await supabase
                 .from('seapod_production')
                 .select('id')
                 .eq('order_number', String(order.order_number)) 
                 .single();

             if (assignedSeapod) {
                 await supabase.from('seapod_production')
                    .update({ order_number: null, status: 'Completed' })
                    .eq('id', assignedSeapod.id);
             }
        }
    }

    // 2. PICKUP DATE VALIDATION
    if (field === 'status' && (value === 'Ready for Pickup' || value === 'Shipped')) {
        if (!order.pickup_date) {
            alert("⚠️ Cannot move status: 'Pick up date' is required.");
            return;
        }
    }

    // 3. ADVANCED VALIDATION (Dynamic Serials)
    const statusesRequiringValidation = ['In Box', 'Ready for Pickup', 'Shipped'];

    if (field === 'status' && statusesRequiringValidation.includes(value)) {
        
        // --- DYNAMIC SERIAL CHECK BASED ON MASTER ITEMS DB ---
        const missingSerials = items.filter(item => {
            const master = masterItems.find(m => m.name === item.piece);
            return master?.serial_needed && (!item.serial || item.serial.trim() === '' || item.serial === '-');
        });

        if (missingSerials.length > 0) {
            const names = missingSerials.map(i => i.piece).join(', ');
            alert(`⚠️ The following items require a Serial Number:\n\n${names}\n\nPlease fill them before proceeding.`);
            return; 
        }

        // --- SEAPOD LINKING CHECK ---
        const seapodItem = items.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));
        
        if (seapodItem && seapodItem.serial) {
            const { data: existingSeapod } = await supabase
                .from('seapod_production')
                .select('id, status, order_number')
                .eq('serial_number', seapodItem.serial)
                .single();

            if (!existingSeapod) {
                setMissingSeapodSerial(seapodItem.serial);
                setPendingStatus(value);
                setSeapodStep(1); 
                setShowSeapodModal(true);
                return; 
            } else {
                const isMySeapod = String(existingSeapod.order_number) === String(order.order_number);
                
                if (!isMySeapod) {
                    if (existingSeapod.status !== 'Completed' && existingSeapod.status !== 'Assigned to Order') {
                        alert(`⚠️ Seapod ${seapodItem.serial} status is '${existingSeapod.status}'. It must be 'Completed' first.`);
                        return;
                    }
                    if (existingSeapod.order_number && String(existingSeapod.order_number) !== String(order.order_number)) {
                        setConflictDetails({
                            serial: seapodItem.serial,
                            assignedTo: existingSeapod.order_number,
                            itemId: seapodItem.id
                        });
                        setShowAssignedModal(true);
                        return; 
                    }
                    await supabase.from('seapod_production').update({ 
                        order_number: String(order.order_number), 
                        status: 'Assigned to Order' 
                    }).eq('id', existingSeapod.id);
                }
            }
        }
    }

    // 4. SHIPPING MODAL
    if (field === 'status' && value === 'Shipped') {
        if (!order.vessel || order.vessel === 'Unknown Vessel') {
            alert("⚠️ Cannot Ship: Vessel Name is required.");
            return; 
        }
        setShowShipModal(true); 
        return; 
    }

    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  async function handleTypeChange(newType) {
    if (isLocked) return;
    const patch = { type: newType };
    if (!SUB_TYPE_OPTIONS[newType]) patch.sub_type = null;
    setOrder(prev => ({ ...prev, ...patch }));
    await supabase.from('orders').update(patch).eq('id', orderId);
  }

  // --- SEAPOD WIZARD LOGIC ---
  function goToAckStep() {
    const tpl = seapodTemplates.find(t => t.id === selectedSeapodTemplate);
    setTplDetails(tpl);
    
    supabase.from('seapod_production').insert([{
        serial_number: missingSeapodSerial,
        template_name: tpl.name,
        seapod_version: tpl.seapod_version,
        hw_version: tpl.hw_version,
        sw_version: tpl.sw_version,
        assembly_item_id: tpl.assembly_item_id,
        bom_id: tpl.bom_id,
        status: 'In Progress',
        created_by: userEmail 
    }]).select().single().then(({data, error}) => {
        if(error) { alert(error.message); return; }
        setNewSeapodId(data.id);
        
        supabase.from('seapod_template_items').select('*').eq('template_id', selectedSeapodTemplate).then(({data: tItems}) => {
            const itemsToInsert = tItems.map(i => ({ 
                seapod_id: data.id, 
                piece: i.piece, 
                item_id: i.item_id, 
                quantity: i.quantity, 
                sort_order: i.sort_order,
                serial: i.piece.toLowerCase().includes('seapod') ? missingSeapodSerial : ''
            }));
            supabase.from('seapod_items').insert(itemsToInsert).then(() => {
                supabase.from('seapod_items').select('*').eq('seapod_id', data.id).order('sort_order').then(({data: i}) => {
                    setNewSeapodItems(i);
                    setSeapodStep(2); 
                });
            });
        });
    });
  }

  async function updateSeapodItemSerial(itemId, newSerial) {
    setNewSeapodItems(prev => prev.map(i => i.id === itemId ? { ...i, serial: newSerial } : i));
    await supabase.from('seapod_items').update({ serial: newSerial }).eq('id', itemId);
  }

  async function handleWizardComplete() {
    const missing = newSeapodItems.some(i => !i.serial || i.serial.trim() === '');
    if (missing) { alert("Please fill ALL serial numbers."); return; }
    setSeapodStep(3); 
  }

  async function finalWizardSubmit() {
    await supabase.from('seapod_production').update({ 
        status: 'Assigned to Order', 
        order_number: String(order.order_number), 
        completed_at: new Date().toISOString()
    }).eq('id', newSeapodId);

    setShowSeapodModal(false);

    try {
        const res = await fetch('/api/trigger-seapod-build', { method: 'POST', body: JSON.stringify({ seapodId: newSeapodId }) });
        const json = await res.json();
        if (json.error) console.error("Webhook Error: " + json.error);
    } catch(e) { console.error(e); }
    
    if (pendingStatus) {
        setOrder(prev => ({ ...prev, status: pendingStatus }));
        await supabase.from('orders').update({ status: pendingStatus }).eq('id', orderId);
        setPendingStatus(null);
    }
  }

  // --- ACTIONS ---
  async function confirmShipping() {
    setShipping(true);
    try {
        const res = await fetch('/api/trigger-shipping', { method: 'POST', body: JSON.stringify({ orderId: orderId }) });
        const json = await res.json();
        
        if (json.error) {
             alert("Error: " + json.error);
        } else {
             setOrder({ ...order, status: 'Shipped' });
             await supabase.from('orders').update({ 
                 status: 'Shipped',
                 shipped_at: new Date().toISOString()
             }).eq('id', orderId);
             setShowShipModal(false); 
        }
    } catch (e) { alert(e.message); }
    setShipping(false);
  }

  async function handleClearConflict() {
    setItems(prev => prev.map(i => i.id === conflictDetails.itemId ? { ...i, serial: '' } : i));
    await supabase.from('order_items').update({ serial: '' }).eq('id', conflictDetails.itemId);
    setShowAssignedModal(false);
    setConflictDetails(null);
  }

  // --- FILE DRAG & DROP ---
  async function performUpload(file) {
    if (isLocked) return;
    setUploading(true);
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${file.name.split('.').pop()}`;
    const filePath = `${orderId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('order-attachments').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }
    const { data: fileRecord } = await supabase.from('order_files').insert([{ order_id: orderId, file_name: file.name, file_path: filePath, uploaded_by: isAdmin ? 'Admin' : 'User' }]).select().single();
    if (fileRecord) setFiles([fileRecord, ...files]);
    setUploading(false);
  }

  const onFileSelect = (e) => { if (e.target.files && e.target.files.length > 0) performUpload(e.target.files[0]); };
  const onDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) performUpload(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  function openFile(path) {
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(path);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  }

  // --- PDF + INVOICE ACTIONS ---
  async function getLogoDataUrl() {
    const res = await fetch('/orca-logo.png');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  }

  function updatePackageItem(idx, field, value) {
    setPackageItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function deletePackageItem(idx) {
    setPackageItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function buildPackingListDoc(withPrices) {
    const { jsPDF } = await import('jspdf');
    const jspdfautotable = await import('jspdf-autotable');
    const autoTable = jspdfautotable.default || jspdfautotable;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const margin = 14;
    const logoDataUrl = await getLogoDataUrl();

    doc.addImage(logoDataUrl, 'PNG', margin, 8, 48, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Master of ${(order.vessel || '').toUpperCase()}`, pageW / 2, 16, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 20, pageW - margin, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Vessel: ${order.vessel || ''}`, margin, 26);
    doc.text('Packing list', pageW / 2, 26, { align: 'center' });
    doc.text(String(order.order_number), pageW - margin, 26, { align: 'right' });

    const tableData = items.map(item => [
        item.piece || '-',
        item.serial || '-',
        masterItems.find(m => m.name === item.piece)?.sku || item.orca_id || '-',
        withPrices ? `$${(item.price || 0).toLocaleString()}` : '-',
        String(item.quantity || 1),
        ''
    ]);

    autoTable(doc, {
        startY: 30,
        margin: { left: margin, right: margin },
        head: [['ITEM', 'REF', 'PART NUMBER', 'PRICE PER QTY', 'QTY', 'CH']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [1, 118, 211], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 4: { halign: 'center', cellWidth: 16 }, 5: { halign: 'center', cellWidth: 14 } }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Orca AI Representative: Israel Kalaora', margin, finalY);
    if (order.pickup_date) {
        doc.text(new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('en-GB'), margin, finalY + 5.5);
    }
    if (withPrices) {
        const total = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total cost   $${total.toLocaleString()}`, pageW - margin, finalY, { align: 'right' });
    }
    return doc;
  }

  async function exportToPdf() {
    const doc = await buildPackingListDoc(canShip);
    doc.save(`PackingList_${order.order_number}.pdf`);
  }

  async function loadAddresses() {
    const { data } = await supabase.from('addresses').select('*').order('company_name');
    setAddresses(data || []);
  }

  async function createNewAddress() {
    if (!newAddress.company_name || !newAddress.address) {
        alert('Company name and address are required.');
        return;
    }
    const { data, error } = await supabase.from('addresses').insert([newAddress]).select().single();
    if (error) { alert(error.message); return; }
    const updated = [...addresses, data].sort((a, b) => a.company_name.localeCompare(b.company_name));
    setAddresses(updated);
    setInvoiceForm(prev => ({ ...prev, addressId: data.id }));
    setNewAddress({ company_name: '', address: '', phone: '', email: '', pic: '' });
    setShowAddressCreate(false);
  }

  async function generateCommercialInvoice() {
    if (!invoiceForm.addressId) { alert('Please select a receiver address.'); return; }
    if (packageItems.length === 0) { alert('Please select a package type.'); return; }
    setGeneratingInvoice(true);
    try {
        const { jsPDF } = await import('jspdf');
        const jspdfautotable = await import('jspdf-autotable');
        const autoTable = jspdfautotable.default || jspdfautotable;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 14;
        const logoDataUrl = await getLogoDataUrl();

        const address = addresses.find(a => a.id === invoiceForm.addressId);
        const shipDate = order.pickup_date
            ? new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
            : '-';

        // HEADER
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.setTextColor(0, 0, 0);
        doc.text('Commercial Invoice', margin, 20);
        doc.addImage(logoDataUrl, 'PNG', 155, 9, 41, 8);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, 25, pageW - margin, 25);

        // SHIPPER (left column)
        let y = 33;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Shipper/Exporter:', margin, y);
        doc.line(margin, y + 0.8, margin + 36, y + 0.8);
        y += 7;

        const shipperRows = [
            { label: 'Point of Contact: ', value: 'Izel Kalaora' },
            { label: 'Company Name: ', value: 'Orca AI' },
            { label: 'Address: ', value: '35 Hamasger Street, Orca AI Office,' },
            { label: '', value: '28th Floor, Sky Tower,' },
            { label: '', value: 'Tel Aviv, 6721407, Israel' },
            { label: 'Phone: ', value: '+972 52-374-4737' },
            { label: 'Email: ', value: 'israel@orca-ai.io' },
            { label: 'VAT/Tax ID: ', value: '515829422' },
        ];

        doc.setFontSize(8.5);
        shipperRows.forEach(({ label, value }) => {
            if (label) {
                doc.setFont('helvetica', 'bold');
                doc.text(label, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin + doc.getTextWidth(label), y);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.text(value, margin, y);
            }
            y += 5.5;
        });

        const shipperEndY = y;

        // INVOICE DETAILS TABLE (right column)
        autoTable(doc, {
            startY: 33,
            margin: { left: 110, right: margin },
            tableWidth: pageW - margin - 110,
            body: [
                [
                    { content: `Date:\n${shipDate}`, styles: { fontStyle: 'bold' } },
                    { content: `Invoice No. ${order.order_number}`, styles: { fontStyle: 'bold', halign: 'right' } }
                ],
                [
                    { content: 'Currency Used', styles: { fontStyle: 'bold' } },
                    { content: invoiceForm.currency }
                ],
                [
                    { content: 'Terms of Sale', styles: { fontStyle: 'bold' } },
                    { content: 'Terms of Freight', styles: { fontStyle: 'bold' } }
                ],
                [
                    { content: 'Warranty Replacement' },
                    { content: invoiceForm.termsOfFreight }
                ],
                [
                    { content: 'No of Packages', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
                ],
                [
                    { content: String(invoiceForm.packages), colSpan: 2, styles: { halign: 'center' } }
                ],
            ],
            styles: { fontSize: 8, cellPadding: 2.5 },
            theme: 'grid',
        });

        // RECEIVER OF GOODS
        let y2 = Math.max(shipperEndY, doc.lastAutoTable.finalY) + 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Receiver of Goods:', margin, y2);
        doc.line(margin, y2 + 0.8, margin + 38, y2 + 0.8);

        y2 += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TO MASTER OF ${(order.vessel || '').toUpperCase()}`, margin, y2);

        y2 += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);

        if (address) {
            doc.text(address.company_name || '', margin, y2); y2 += 5.5;
            const addrLines = doc.splitTextToSize(address.address || '', 92);
            addrLines.forEach(line => { doc.text(line, margin, y2); y2 += 5.5; });
            if (address.phone) {
                doc.setFont('helvetica', 'bold'); doc.text('Phone :', margin, y2);
                doc.setFont('helvetica', 'normal'); doc.text(` ${address.phone}`, margin + doc.getTextWidth('Phone :'), y2); y2 += 5.5;
            }
            if (address.email) {
                doc.setFont('helvetica', 'bold'); doc.text('Email:', margin, y2);
                doc.setFont('helvetica', 'normal'); doc.text(`   ${address.email}`, margin + doc.getTextWidth('Email:'), y2); y2 += 5.5;
            }
            if (address.pic) { doc.text(`PIC- ${address.pic}`, margin, y2); y2 += 5.5; }
        }

        // ITEMS TABLE
        y2 += 8;
        autoTable(doc, {
            startY: y2,
            margin: { left: margin, right: margin },
            head: [['Item & Description', 'HS No.', 'Unit Value', 'Quantity', 'Weight: Lbs', 'Value']],
            body: packageItems.map(item => [item.description, item.hs, item.unitValue, String(item.quantity), item.weight, item.value]),
            styles: { fontSize: 8.5, cellPadding: 3 },
            headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0.3, lineColor: [100, 100, 100] },
            bodyStyles: { lineWidth: 0.3, lineColor: [100, 100, 100] },
            theme: 'plain',
        });

        // FOOTER
        const footerY = doc.lastAutoTable.finalY + 14;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('I hereby certify this commercial invoice to be true and correct.', margin, footerY);
        doc.text(`Date: ${shipDate}`, margin, footerY + 9);
        doc.text('Respectfully,', margin, footerY + 18);
        doc.text('Orca AI Ltd.', margin, footerY + 27);

        // ATTACH TO ORDER
        const pdfBlob = doc.output('blob');
        const fileName = `${order.vessel} - CI.pdf`;
        const filePath = `${orderId}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage.from('order-attachments').upload(filePath, pdfBlob, { contentType: 'application/pdf' });
        if (uploadError) { alert(uploadError.message); setGeneratingInvoice(false); return; }

        const { data: fileRecord } = await supabase.from('order_files').insert([{
            order_id: orderId,
            file_name: fileName,
            file_path: filePath,
            uploaded_by: 'System'
        }]).select().single();

        if (fileRecord) setFiles(prev => [fileRecord, ...prev]);

        // GENERATE AND ATTACH PACKING LIST
        const withPrices = generatePackingList === 'yes';
        const plDoc = await buildPackingListDoc(withPrices);
        const plBlob = plDoc.output('blob');
        const plFileName = `${order.vessel} - PL.pdf`;
        const plFilePath = `${orderId}/${Date.now()}_${plFileName}`;
        const { error: plErr } = await supabase.storage.from('order-attachments').upload(plFilePath, plBlob, { contentType: 'application/pdf' });
        if (!plErr) {
            const { data: plRecord } = await supabase.from('order_files').insert([{
                order_id: orderId, file_name: plFileName, file_path: plFilePath, uploaded_by: 'System'
            }]).select().single();
            if (plRecord) setFiles(prev => [plRecord, ...prev]);
        }

        setShowInvoiceModal(false);
    } catch (e) {
        console.error(e);
        alert('Failed to generate invoice: ' + e.message);
    }
    setGeneratingInvoice(false);
  }

  // --- ITEM ACTIONS ---

  async function updateItem(itemId, field, value) {
    if (isLocked) return;
    let updateData = { [field]: value };
    if (field === 'piece') {
        const selectedMaster = masterItems.find(m => m.name === value);
        if (selectedMaster) updateData.price = selectedMaster.price;
    }
    const newItems = items.map(i => i.id === itemId ? { ...i, ...updateData } : i);
    setItems(newItems);
    await supabase.from('order_items').update(updateData).eq('id', itemId);
  }

  async function addItem() {
    if (isLocked && !canShip) return; 
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;
    const newItem = { order_id: orderId, piece: '', quantity: 1, serial: '', price: 0, is_done: false, sort_order: nextOrder };
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function deleteItem(itemId) {
    if (isLocked && !canShip) return; 
    
    if (!isAdmin) {
        if (!canShip) { 
            alert("Permission Denied: Only Admins or Operations can delete items."); 
            return; 
        }
        const restrictedStatuses = ['In Box', 'Ready for Pickup', 'Shipped'];
        if (restrictedStatuses.includes(order.status)) {
            alert(`Operations cannot delete items when status is '${order.status}'. Please contact an Admin.`);
            return;
        }
    }
    
    if(!confirm('Remove this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  // --- RENDER ---
  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-slate-500">Loading Order...</div></div>;
  if (!order) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-red-500">Order not found.</div></div>;
  
  const totalCost = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <div className="flex-1 ml-64">
          
          {/* HEADER */}
          <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
            <div className="max-w-[1600px] mx-auto px-6 py-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 rounded-lg flex items-center justify-center">
                     <Box size={24} />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">{order.vessel || 'No Vessel Name'}</h1>
                        {isLocked && <Lock size={18} className="text-red-500" title="Order Locked" />}
                     </div>
                     <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-600">
                            #{order.order_number}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Building2 size={12} /> {order.account_name || 'No Account'}
                        </span>
                        {order.created_by && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 border-l border-slate-200 pl-3">
                                <User size={10}/> By {order.created_by} • {new Date(order.created_at).toLocaleDateString()}
                            </span>
                        )}
                     </div>
                   </div>
                </div>

                <div className="flex items-end gap-3">
                    {isAdmin && (
                        <button 
                            onClick={handleManualWebhook} 
                            className="bg-white border border-orange-200 text-orange-600 font-bold px-3 py-2 rounded-md text-sm shadow-sm hover:bg-orange-50 flex items-center gap-2"
                            title="Force Resend Webhook"
                        >
                            <RefreshCcw size={16}/> Resend Data
                        </button>
                    )}

                    <button onClick={exportToPdf} className="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-md text-sm shadow-sm hover:bg-slate-50 flex items-center gap-2">
                        <Download size={16}/> Export PDF
                    </button>

                    {canShip && (
                        <button
                            onClick={() => {
                            loadAddresses();
                            setSelectedPackage('');
                            setPackageItems([]);
                            setGeneratePackingList('yes');
                            setAddressSearch('');
                            setInvoiceForm({ currency: 'USD', termsOfFreight: 'DDP', packages: 1, addressId: '' });
                            setShowInvoiceModal(true);
                        }}
                            className="bg-white border border-emerald-300 text-emerald-700 font-bold px-3 py-2 rounded-md text-sm shadow-sm hover:bg-emerald-50 flex items-center gap-2"
                        >
                            <FileText size={16}/> Generate Commercial Invoice
                        </button>
                    )}

                    <div className="flex flex-col items-end">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                        <select 
                            value={order.status || 'New'} 
                            onChange={(e) => updateOrder('status', e.target.value)} 
                            disabled={isLocked && !canShip} 
                            className={`bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-md shadow-sm focus:ring-2 focus:ring-[#0176D3] block w-44 p-2 outline-none ${isLocked ? 'bg-gray-100 text-gray-500' : ''}`}
                        >
                            <option value="New">New</option>
                            <option value="In preparation">In preparation</option>
                            <option value="In Box">In Box</option>
                            <option value="Ready for Pickup">Ready for Pickup</option>
                            {(canShip || order.status === 'Shipped') && <option value="Shipped">Shipped</option>}
                        </select>
                    </div>
                </div>
              </div>
            </div>
          </div>

          <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* Order Details Form */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</h3>
                    </div>
                    <div className="p-5 space-y-5">
                        <div>
                            <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1.5">
                                <span className="flex items-center gap-2"><Ship size={14} /> Vessel Name <span className="text-red-500">*</span></span>
                                {checkingVessel && <span className="text-[#0176D3] flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Checking...</span>}
                            </label>
                            <input 
                                className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none text-slate-900" 
                                placeholder="Enter Name & Click Away" 
                                value={order.vessel || ''} 
                                disabled={!canShip || isLocked || checkingVessel} 
                                onChange={(e) => updateOrder('vessel', e.target.value)} 
                                onBlur={handleVesselBlur} 
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Building2 size={14} /> Account Name</label>
                            <input className="w-full text-sm font-medium border border-slate-200 bg-slate-50 rounded px-3 py-2 text-slate-500 cursor-not-allowed" value={order.account_name || ''} readOnly placeholder="Auto-filled" />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Box size={14} /> NS Sales Order</label>
                            <input className="w-full text-sm font-medium border border-slate-200 bg-slate-50 rounded px-3 py-2 text-slate-500 cursor-not-allowed" value={order.ns_so_number || ''} readOnly placeholder="Assigned after shipping" />
                        </div>

                        {canEditWarehouse && (
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Warehouse size={14} /> Warehouse</label>
                                <select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white text-slate-900" value={order.warehouse || 'Orca'} onChange={(e) => updateOrder('warehouse', e.target.value)} disabled={isLocked}>
                                    <option value="Orca">Orca</option>
                                    <option value="Baz">Baz</option>
                                    <option value="JNSU">JNSU</option>
                                </select>
                            </div>
                        )}
                        
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Calendar size={14} /> Pickup Date</label>
                            <input type="date" className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none text-slate-700" value={order.pickup_date || ''} disabled={isLocked} onChange={(e) => updateOrder('pickup_date', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Shipping Tracking Code</label>
                            <input className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none text-slate-900" placeholder="Enter tracking code" value={order.shipping_tracking_code || ''} disabled={isLocked} onChange={(e) => updateOrder('shipping_tracking_code', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kit Type</label>
                            <select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white" value={order.type || ''} disabled={isLocked} onChange={(e) => handleTypeChange(e.target.value)} >
                                <option>Full system</option><option>Upgrade</option><option>Replacement</option><option>Spare Parts</option><option>Partial System</option>
                            </select>
                        </div>
                        {SUB_TYPE_OPTIONS[order.type] && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sub Type</label>
                                <select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white" value={order.sub_type || ''} disabled={isLocked} onChange={(e) => updateOrder('sub_type', e.target.value || null)} >
                                    <option value="">- Select -</option>
                                    {SUB_TYPE_OPTIONS[order.type].map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* File Upload Drag & Drop */}
                <div 
                    className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-colors ${isDragging && !isLocked ? 'border-[#0176D3] bg-blue-50/50' : 'border-slate-200'}`} 
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                >
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2"><Paperclip size={14}/> Attachments ({files.length})</h3>
                        {canShip && !isLocked && (
                            <label className="cursor-pointer text-xs font-bold text-[#0176D3] hover:underline flex items-center gap-1">
                                {uploading ? 'Uploading...' : '+ Upload'}
                                <input type="file" className="hidden" onChange={onFileSelect} disabled={uploading || isLocked} />
                            </label>
                        )}
                    </div>
                    {isDragging && !isLocked && <div className="p-4 text-center text-[#0176D3] font-bold text-sm bg-blue-50">Drop files here to upload</div>}
                    <div className="divide-y divide-slate-50">
                        {files.map(file => (
                            <div key={file.id} onClick={() => openFile(file.file_path)} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors group">
                                <div className="bg-blue-100 p-1.5 rounded text-blue-600"><FileText size={16}/></div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0176D3] group-hover:underline">{file.file_name}</p>
                                    <p className="text-[10px] text-slate-400">Uploaded by {file.uploaded_by}</p>
                                </div>
                            </div>
                        ))}
                        {files.length === 0 && !isDragging && <div className="p-6 text-center text-slate-400 text-xs italic">No files attached. Drag & drop here.</div>}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2">
               <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                   
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Line Items</h3>
                      <div className="flex items-center gap-4">
                          {canShip && (
                              <div className="text-sm font-bold text-slate-700">Total: <span className="text-[#0176D3]">${totalCost.toFixed(2)}</span></div>
                          )}
                          <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded">{items.length} Items</span>
                      </div>
                   </div>
                   
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-400 font-bold">
                        <tr>
                            <th className="px-6 py-3">Item</th>
                            <th className="px-6 py-3 w-20">Qty</th>
                            <th className="px-6 py-3 w-32">Serial #</th>
                            <th className="px-6 py-3 w-32">Orca ID</th>
                            {canShip && <th className="px-6 py-3 w-28 text-right">Unit Price</th>}
                            <th className="w-10"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {items.map((item) => {
                         const isSerialReq = masterItems.find(m => m.name === item.piece)?.serial_needed;
                         return (
                         <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            
                            {/* SEARCHABLE INPUT */}
                            <td className="px-6 py-3 relative">
                               <input 
                                   list={`options-${item.id}`} 
                                   className={`w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-900 ${!item.piece ? 'border-b border-red-300' : ''}`}
                                   value={item.piece || ''}
                                   onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                                   disabled={isLocked}
                                   placeholder="Search Item..."
                               />
                               <datalist id={`options-${item.id}`}>
                                   {masterItems.map(m => (<option key={m.id} value={m.name}>{m.sku}</option>))}
                               </datalist>
                            </td>

                            <td className="px-6 py-3">
                                <input type="number" className="w-full bg-transparent border-none outline-none" value={item.quantity || 1} disabled={isLocked} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} />
                            </td>
                            
                            {/* RED BORDER IF SERIAL NEEDED AND EMPTY */}
                            <td className="px-6 py-3">
                               <input 
                                   className={`w-full bg-transparent border-b ${isSerialReq && (!item.serial || item.serial.trim() === '') ? 'border-red-300 bg-red-50' : 'border-transparent'} outline-none text-[#0176D3] font-medium placeholder-slate-300`} 
                                   value={item.serial || ''} 
                                   disabled={isLocked} 
                                   onChange={(e) => updateItem(item.id, 'serial', e.target.value)} 
                                   placeholder="---" 
                               />
                            </td>
                            
                            <td className="px-6 py-3">
                                <input className="w-full bg-transparent border-none outline-none text-slate-600 placeholder-slate-300" value={item.orca_id || ''} disabled={isLocked} onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)} placeholder="---" />
                            </td>
                            
                            {canShip && (
                                <td className="px-6 py-3 text-right">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0176D3] outline-none text-xs font-mono text-slate-600"
                                        value={item.price || 0}
                                        disabled={isLocked}
                                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                            )}
                            
                            <td className="px-4 py-3 text-right">
                                {(!isLocked) && (isAdmin || (canShip && !['In Box', 'Ready for Pickup', 'Shipped'].includes(order.status))) && (
                                   <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                )}
                            </td>
                         </tr>
                       )})}
                     </tbody>
                   </table>
                   
                   {!isLocked && (
                       <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0176D3] transition-colors flex items-center justify-center gap-2 border-t border-slate-200">
                           <Plus size={16} /> Add New Line Item
                       </button>
                   )}
                </div>
            </div>
          </main>

          {/* --- ALL MODALS --- */}
          
          {/* SHIP MODAL */}
          {showShipModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-slate-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 text-[#0176D3] rounded-full flex items-center justify-center mb-4"><Ship size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900">Confirm Shipment?</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">This will <strong>lock the order</strong> and send data. Cannot be undone.</p>
                  <div className="flex gap-3 w-full">
                      <button onClick={() => setShowShipModal(false)} disabled={shipping} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                      <button onClick={confirmShipping} disabled={shipping} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">{shipping ? 'Processing...' : 'Confirm & Ship'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONFLICT MODAL */}
          {showAssignedModal && conflictDetails && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-red-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><XCircle size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900">Seapod Already Assigned</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">Seapod <strong>{conflictDetails.serial}</strong> is already assigned to <strong>Order #{conflictDetails.assignedTo}</strong>.<br/>Please use a different Seapod or check the number.</p>
                  <div className="flex gap-3 w-full">
                      <button onClick={handleClearConflict} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">OK, Clear Serial</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEAPOD WIZARD MODAL */}
          {showSeapodModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-blue-100 h-[80vh] flex flex-col">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2"><Cpu size={24} /></div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {seapodStep === 1 ? "Seapod Not Found" : seapodStep === 3 ? "Verify Versions" : `Build: ${missingSeapodSerial}`}
                        </h3>
                        {seapodStep === 1 && <p className="text-sm text-slate-500">Seapod <strong>{missingSeapodSerial}</strong> does not exist. Create it now to proceed.</p>}
                    </div>

                    {/* Step 1 */}
                    {seapodStep === 1 && (
                        <div className="flex-1 flex flex-col justify-center">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Select Template</label>
                            <select className="w-full max-w-sm mx-auto border border-slate-300 rounded px-3 py-2 text-sm font-medium" value={selectedSeapodTemplate} onChange={(e) => setSelectedSeapodTemplate(e.target.value)}>
                                {seapodTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <div className="mt-8 flex gap-3 max-w-sm mx-auto w-full">
                                <button onClick={() => setShowSeapodModal(false)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Cancel</button>
                                <button onClick={goToAckStep} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">Start Build</button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 */}
                    {seapodStep === 2 && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b sticky top-0">
                                        <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 w-20">Qty</th><th className="px-4 py-2">Serial Number</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {newSeapodItems.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-sm">{item.piece}</td>
                                                <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        className="serial-input w-full border rounded px-2 py-1 text-sm focus:border-[#0176D3] outline-none font-medium text-[#0176D3]" 
                                                        value={item.serial || ''} 
                                                        onChange={(e) => updateSeapodItemSerial(item.id, e.target.value)} 
                                                        placeholder="Enter Serial..." 
                                                        onKeyDown={(e) => { 
                                                            if (e.key === 'Enter') { 
                                                                e.preventDefault(); 
                                                                const inputs = document.querySelectorAll('.serial-input'); 
                                                                if (index < inputs.length - 1) inputs[index + 1].focus(); 
                                                            } 
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={handleWizardComplete} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center justify-center gap-2"><Check size={20}/> Complete Build</button>
                        </div>
                    )}

                    {/* Step 3 */}
                    {seapodStep === 3 && tplDetails && (
                        <div className="flex-1 flex flex-col justify-center text-center px-8">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 text-left">
                                <div className="mb-4 pb-4 border-b border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Seapod Version</span>
                                    <span className="text-lg font-bold text-[#0176D3]">{tplDetails.seapod_version || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><span className="text-[10px] font-bold text-slate-400 uppercase block">HW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.hw_version}</span></div>
                                    <div><span className="text-[10px] font-bold text-slate-400 uppercase block">SW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.sw_version}</span></div>
                                </div>
                            </div>
                            <div className="flex gap-3 max-w-sm mx-auto w-full">
                                <button onClick={() => setSeapodStep(2)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Back</button>
                                <button onClick={finalWizardSubmit} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">I Acknowledge</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
          {/* COMMERCIAL INVOICE MODAL */}
          {showInvoiceModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Generate Commercial Invoice</h3>
                  <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Currency Used</label>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none bg-white text-slate-900"
                      value={invoiceForm.currency}
                      onChange={e => setInvoiceForm(p => ({ ...p, currency: e.target.value }))}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  {/* Terms of Freight */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Terms of Freight</label>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none bg-white text-slate-900"
                      value={invoiceForm.termsOfFreight}
                      onChange={e => setInvoiceForm(p => ({ ...p, termsOfFreight: e.target.value }))}
                    >
                      <option value="DAP">DAP</option>
                      <option value="DDP">DDP</option>
                      <option value="CIF">CIF</option>
                    </select>
                  </div>

                  {/* No of Packages */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">No of Packages</label>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none bg-white text-slate-900"
                      value={invoiceForm.packages}
                      onChange={e => setInvoiceForm(p => ({ ...p, packages: Number(e.target.value) }))}
                    >
                      {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Receiver Address</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none text-slate-900"
                          placeholder="Search address..."
                          value={addressSearch}
                          onChange={e => {
                            setAddressSearch(e.target.value);
                            setInvoiceForm(p => ({ ...p, addressId: '' }));
                            setShowAddressList(true);
                          }}
                          onFocus={() => setShowAddressList(true)}
                          onBlur={() => setTimeout(() => setShowAddressList(false), 150)}
                        />
                        {showAddressList && (
                          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {addresses
                              .filter(a => !addressSearch || a.company_name.toLowerCase().includes(addressSearch.toLowerCase()) || (a.pic || '').toLowerCase().includes(addressSearch.toLowerCase()))
                              .map(a => (
                                <div
                                  key={a.id}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => {
                                    setInvoiceForm(p => ({ ...p, addressId: a.id }));
                                    setAddressSearch(a.company_name + (a.pic ? ` — ${a.pic}` : ''));
                                    setShowAddressList(false);
                                  }}
                                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-[#0176D3] flex items-center justify-between"
                                >
                                  <span className="font-medium">{a.company_name}</span>
                                  {a.pic && <span className="text-slate-400 text-xs ml-2">{a.pic}</span>}
                                </div>
                              ))
                            }
                            {addresses.filter(a => !addressSearch || a.company_name.toLowerCase().includes(addressSearch.toLowerCase()) || (a.pic || '').toLowerCase().includes(addressSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-slate-400 italic">No matches</div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowAddressCreate(true)}
                        className="px-3 py-2 border border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                      >
                        + New
                      </button>
                    </div>
                    {invoiceForm.addressId && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Address selected</p>
                    )}
                  </div>

                  {/* Package Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Package Type</label>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none bg-white text-slate-900"
                      value={selectedPackage}
                      onChange={e => {
                        setSelectedPackage(e.target.value);
                        if (e.target.value && INVOICE_PACKAGES[e.target.value]) {
                          setPackageItems(INVOICE_PACKAGES[e.target.value].items.map(item => ({ ...item })));
                        } else {
                          setPackageItems([]);
                        }
                      }}
                    >
                      <option value="">Select package...</option>
                      {Object.entries(INVOICE_PACKAGES).map(([key, pkg]) => (
                        <option key={key} value={key}>{pkg.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Editable package items */}
                  {packageItems.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Items — edit or remove as needed</label>
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs min-w-[520px]">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-bold text-slate-400">Description</th>
                              <th className="px-2 py-1.5 text-left font-bold text-slate-400 w-16">HS No.</th>
                              <th className="px-2 py-1.5 text-left font-bold text-slate-400 w-16">Unit Val</th>
                              <th className="px-2 py-1.5 text-center font-bold text-slate-400 w-10">Qty</th>
                              <th className="px-2 py-1.5 text-left font-bold text-slate-400 w-14">Lbs</th>
                              <th className="px-2 py-1.5 text-left font-bold text-slate-400 w-14">Value</th>
                              <th className="w-6"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {packageItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-2 py-1.5">
                                  <input className="w-full bg-transparent outline-none text-slate-900 text-xs border-b border-transparent focus:border-[#0176D3]" value={item.description} onChange={e => updatePackageItem(idx, 'description', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="w-full bg-transparent outline-none text-slate-600 text-xs border-b border-transparent focus:border-[#0176D3]" value={item.hs} onChange={e => updatePackageItem(idx, 'hs', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="w-full bg-transparent outline-none text-slate-600 text-xs border-b border-transparent focus:border-[#0176D3]" value={item.unitValue} onChange={e => updatePackageItem(idx, 'unitValue', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input className="w-full bg-transparent outline-none text-slate-600 text-xs text-center border-b border-transparent focus:border-[#0176D3]" value={item.quantity} onChange={e => updatePackageItem(idx, 'quantity', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="w-full bg-transparent outline-none text-slate-600 text-xs border-b border-transparent focus:border-[#0176D3]" value={item.weight} onChange={e => updatePackageItem(idx, 'weight', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="w-full bg-transparent outline-none text-slate-600 text-xs border-b border-transparent focus:border-[#0176D3]" value={item.value} onChange={e => updatePackageItem(idx, 'value', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <button onClick={() => deletePackageItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Generate packing list with prices */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Generate Packing List with Prices</label>
                    <select
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:border-[#0176D3] outline-none bg-white text-slate-900"
                      value={generatePackingList}
                      onChange={e => setGeneratePackingList(e.target.value)}
                    >
                      <option value="yes">Yes — attach with prices</option>
                      <option value="no">No — attach without prices</option>
                    </select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    disabled={generatingInvoice}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateCommercialInvoice}
                    disabled={generatingInvoice}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm"
                  >
                    {generatingInvoice ? 'Generating...' : 'Generate & Attach'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADDRESS CREATE POPUP */}
          {showAddressCreate && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">New Address</h3>
                  <button onClick={() => setShowAddressCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-3">
                  <input
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                    placeholder="Company name *"
                    value={newAddress.company_name}
                    onChange={e => setNewAddress(p => ({ ...p, company_name: e.target.value }))}
                  />
                  <textarea
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none resize-none"
                    placeholder="Address *"
                    rows={3}
                    value={newAddress.address}
                    onChange={e => setNewAddress(p => ({ ...p, address: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <span className="text-sm font-bold text-slate-500 self-center w-14 shrink-0">Phone</span>
                    <input
                      className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                      placeholder="+1 234 567 8900"
                      value={newAddress.phone}
                      onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sm font-bold text-slate-500 self-center w-14 shrink-0">Email</span>
                    <input
                      className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                      placeholder="contact@company.com"
                      value={newAddress.email}
                      onChange={e => setNewAddress(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sm font-bold text-slate-500 self-center w-14 shrink-0">PIC</span>
                    <input
                      className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                      placeholder="Point of contact name"
                      value={newAddress.pic}
                      onChange={e => setNewAddress(p => ({ ...p, pic: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => setShowAddressCreate(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewAddress}
                    className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}