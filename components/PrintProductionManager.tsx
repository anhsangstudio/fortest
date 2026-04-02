import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, BarChart3, Filter, Plus, Copy, Trash2, Printer, RefreshCw, Loader2, AlertCircle, CheckCircle2, Pencil, X, Link as LinkIcon, FileText, UserRound, Layers3 } from 'lucide-react';
import { createPrintOrder, duplicatePrintOrder, fetchPrintCatalogs, fetchPrintOrders, isConfigured, softDeletePrintOrder, supabase, updatePrintOrder } from '../apiService';
import { PrintCatalogOption, PrintOrder, PrintOrderItemRow, Staff } from '../types';

interface Props { currentUser: Staff | null; }
type SaveState = Record<string, boolean>;
type CatalogState = { sizes: PrintCatalogOption[]; materials: PrintCatalogOption[]; vendors: PrintCatalogOption[]; statuses: PrintCatalogOption[]; };
type StaffOption = { id: string; name: string };
type HeaderFormState = { id: string; tenKhachHang: string; ngayGuiIn: string; statusId: string; nguoiKiemTraNhanAnh: string; ghiChu: string; linkFiles: string; };
type ModalItemRow = PrintOrderItemRow & { itemStatusId?: string | null; tenTrangThaiItem?: string; };
type ReportItemRow = ModalItemRow;
type ItemEditState = { id: string; soLuong: number; sizeId: string; materialId: string; vendorId: string; itemStatusId: string; };

const emptyCatalogs: CatalogState = { sizes: [], materials: [], vendors: [], statuses: [] };
const formatNumber = (value: number) => value.toLocaleString('vi-VN');
const toNonNegativeNumber = (value: string | number) => { const parsed = Number(value); return !Number.isFinite(parsed) || parsed < 0 ? 0 : parsed; };
const createHeaderFormFromRow = (row: PrintOrder): HeaderFormState => ({ id: row.id, tenKhachHang: row.tenKhachHang || '', ngayGuiIn: row.ngayGuiIn || '', statusId: row.statusId || '', nguoiKiemTraNhanAnh: row.nguoiKiemTraNhanAnh || '', ghiChu: row.ghiChu || '', linkFiles: row.linkFiles || '' });
const createItemEditState = (row: ModalItemRow): ItemEditState => ({ id: row.id, soLuong: Number(row.soLuong || 0), sizeId: row.sizeId || '', materialId: row.materialId || '', vendorId: row.vendorId || '', itemStatusId: row.itemStatusId || row.statusId || '' });

const PrintProductionManager: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [rows, setRows] = useState<PrintOrder[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogState>(emptyCatalogs);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ tenKhachHang: '', ngayGuiIn: new Date().toISOString().slice(0, 10), statusId: '' });
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<SaveState>({});
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [listDateRange, setListDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [editingRow, setEditingRow] = useState<PrintOrder | null>(null);
  const [headerForm, setHeaderForm] = useState<HeaderFormState | null>(null);
  const [orderItems, setOrderItems] = useState<ModalItemRow[]>([]);
  const [reportItems, setReportItems] = useState<ReportItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemForms, setItemForms] = useState<Record<string, ItemEditState>>({});
  const [itemSavingMap, setItemSavingMap] = useState<SaveState>({});
  const [isAddingItem, setIsAddingItem] = useState(false);

  const isAdminOrDirector = useMemo(() => !!currentUser && (currentUser.username === 'admin' || currentUser.role === 'Giám đốc'), [currentUser]);
  const canDeleteOrder = isAdminOrDirector;
  const canEditProtectedFields = isAdminOrDirector;
  const canDuplicateOrder = isAdminOrDirector;

  const statusIds = useMemo(() => {
    const map = new Map<string, string>();
    catalogs.statuses.forEach((s) => map.set((s.name || '').trim().toUpperCase(), s.id));
    return { traThieuAnh: map.get('TRẢ THIẾU ẢNH') || '', daDuAnh: map.get('ĐÃ ĐỦ ẢNH') || '', dangInAn: map.get('ĐANG IN ẤN') || '', daGiaoKhach: map.get('ĐÃ GIAO KHÁCH') || '' };
  }, [catalogs.statuses]);

  const setRowSaving = (rowId: string, value: boolean) => setSavingMap((prev) => ({ ...prev, [rowId]: value }));
  const setItemSaving = (itemId: string, value: boolean) => setItemSavingMap((prev) => ({ ...prev, [itemId]: value }));
  const findVendorPrice = async (vendorId: string, sizeId: string, materialId: string): Promise<number | null> => {
    if (!supabase || !vendorId || !sizeId || !materialId) return null;
    const { data, error: priceError } = await supabase
      .from('print_vendor_prices')
      .select('don_gia, created_at')
      .eq('vendor_id', vendorId)
      .eq('size_id', sizeId)
      .eq('material_id', materialId)
      .eq('dang_su_dung', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (priceError) {
      console.error('Load vendor price error:', priceError);
      return null;
    }

    const price = data?.[0]?.don_gia;
    return price == null ? null : Number(price);
  };

  const applyAutoPriceToItemForm = async (itemId: string, nextVendorId: string, nextSizeId: string, nextMaterialId: string) => {
    const autoPrice = await findVendorPrice(nextVendorId, nextSizeId, nextMaterialId);
    if (autoPrice == null) return;

    setItemForms((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          vendorId: nextVendorId,
          sizeId: nextSizeId,
          materialId: nextMaterialId,
          donGiaIn: autoPrice,
        },
      };
    });
  };

  const handleItemFieldChange = async (
    itemId: string,
    field: 'vendorId' | 'sizeId' | 'materialId' | 'soLuong' | 'itemStatusId',
    value: string | number
  ) => {
    if (field === 'soLuong') {
      setItemForms((prev) => ({ ...prev, [itemId]: { ...prev[itemId], soLuong: Number(value) } }));
      return;
    }

    if (field === 'itemStatusId') {
      setItemForms((prev) => ({ ...prev, [itemId]: { ...prev[itemId], itemStatusId: String(value) } }));
      return;
    }

    const current = itemForms[itemId];
    if (!current) return;

    const next = {
      vendorId: field === 'vendorId' ? String(value) : current.vendorId,
      sizeId: field === 'sizeId' ? String(value) : current.sizeId,
      materialId: field === 'materialId' ? String(value) : current.materialId,
    };

    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        vendorId: next.vendorId,
        sizeId: next.sizeId,
        materialId: next.materialId,
      },
    }));

    if (next.vendorId && next.sizeId && next.materialId) {
      await applyAutoPriceToItemForm(itemId, next.vendorId, next.sizeId, next.materialId);
    }
  };

  const loadStaffOptions = async () => {
    if (!supabase) return [];
    const { data, error: staffError } = await supabase.from('staff').select('id, name, status').order('name', { ascending: true });
    if (staffError) { console.error('Load staff error:', staffError); return []; }
    return (data || []).filter((item: any) => !item.status || item.status === 'Active').map((item: any) => ({ id: item.id, name: item.name || item.id }));
  };

  const mapItemRow = (db: any): ModalItemRow => ({
    id: db.id, printOrderId: db.print_order_id, contractId: db.contract_id ?? null, contractCode: db.contract_code || '', customerId: db.customer_id ?? null, tenKhachHang: db.ten_khach_hang || '', ngayGuiIn: db.ngay_gui_in || '', linkTheTrello: db.link_the_trello || '', linkFiles: db.link_files || '', trelloCardId: db.trello_card_id ?? null, trelloBoardId: db.trello_board_id ?? null, trelloListId: db.trello_list_id ?? null, statusId: db.status_id ?? null, tenTrangThai: db.ten_trang_thai || '', itemStatusId: db.item_status_id ?? db.status_id ?? null, tenTrangThaiItem: db.ten_trang_thai_item || '', nguoiKiemTraNhanAnh: db.nguoi_kiem_tra_nhan_anh || '', tenNguoiKiemTraNhanAnh: db.ten_nguoi_kiem_tra_nhan_anh || '', soLuong: Number(db.so_luong || 0), sizeId: db.size_id ?? null, tenKichThuoc: db.ten_kich_thuoc || '', materialId: db.material_id ?? null, tenChatLieu: db.ten_chat_lieu || '', vendorId: db.vendor_id ?? null, tenXuongIn: db.ten_xuong_in || '', donGiaIn: Number(db.don_gia_in || 0), thanhTien: Number(db.thanh_tien || 0), ghiChuItem: db.ghi_chu_item || '', ghiChuDon: db.ghi_chu_don || '', thuTuHienThi: Number(db.thu_tu_hien_thi || 0), dangSuDung: db.dang_su_dung !== false, thongBaoDaCoAnh: !!db.thong_bao_da_co_anh, thongBaoDaGiaoAnh: !!db.thong_bao_da_giao_anh, thongBaoDangInAnh: !!db.thong_bao_dang_in_anh, checkFlag: !!db.check_flag, createdAt: db.created_at || '', updatedAt: db.updated_at || ''
  });

  const loadData = async () => {
    if (!isConfigured) { setError('Chưa cấu hình Supabase. Vui lòng kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'); setRows([]); setCatalogs(emptyCatalogs); setStaffOptions([]); setIsLoading(false); return; }
    setIsLoading(true); setError(null);
    try {
      const [orders, catalogData, staffData] = await Promise.all([fetchPrintOrders(), fetchPrintCatalogs(), loadStaffOptions()]);
      setRows(orders); setCatalogs(catalogData); setStaffOptions(staffData);
    } catch (e: any) {
      console.error('Load print production data error:', e); setError(e?.message || 'Không tải được dữ liệu in ấn.');
    } finally { setIsLoading(false); }
  };

  const loadOrderItems = async (printOrderId: string) => {
    if (!supabase) return;
    setLoadingItems(true);
    try {
      const { data, error: loadItemsError } = await supabase.from('print_order_items_view').select('*').eq('print_order_id', printOrderId).order('thu_tu_hien_thi', { ascending: true }).order('created_at', { ascending: true });
      if (loadItemsError) throw loadItemsError;
      const mapped = (data || []).map(mapItemRow);
      setOrderItems(mapped);
      const forms: Record<string, ItemEditState> = {};
      mapped.forEach((item) => { forms[item.id] = createItemEditState(item); });
      setItemForms(forms);
    } catch (e: any) {
      console.error('Load print order items error:', e); setError(e?.message || 'Không tải được dòng sản phẩm in.'); setOrderItems([]); setItemForms({});
    } finally { setLoadingItems(false); }
  };

  const loadReportItems = async () => {
    if (!supabase) return;
    try {
      let query = supabase.from('print_order_items_view').select('*').order('ngay_gui_in', { ascending: false }).order('print_order_id', { ascending: true }).order('thu_tu_hien_thi', { ascending: true });
      if (dateRange.from) query = query.gte('ngay_gui_in', dateRange.from);
      if (dateRange.to) query = query.lte('ngay_gui_in', dateRange.to);
      const { data, error: loadReportError } = await query;
      if (loadReportError) throw loadReportError;
      setReportItems((data || []).map(mapItemRow));
    } catch (e: any) {
      console.error('Load report items error:', e);
      setError(e?.message || 'Không tải được dữ liệu báo cáo sản phẩm in.');
      setReportItems([]);
    }
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => {
    if (!isConfigured || !supabase) return;
    const channel = supabase.channel('print-orders-realtime-header-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_orders' }, () => { void loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_order_items' }, () => { if (editingRow) void loadOrderItems(editingRow.id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [editingRow]);
  useEffect(() => { if (!successMessage) return; const timer = window.setTimeout(() => setSuccessMessage(null), 2500); return () => window.clearTimeout(timer); }, [successMessage]);
  useEffect(() => { void loadReportItems(); }, [dateRange.from, dateRange.to]);
  useEffect(() => { setCurrentPage(1); }, [listDateRange.from, listDateRange.to, rows.length]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (listDateRange.from && row.ngayGuiIn && row.ngayGuiIn < listDateRange.from) return false;
      if (listDateRange.to && row.ngayGuiIn && row.ngayGuiIn > listDateRange.to) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt || a.ngayGuiIn || '';
      const dateB = b.createdAt || b.ngayGuiIn || '';
      if (dateA !== dateB) return String(dateB).localeCompare(String(dateA));
      return String(b.id).localeCompare(String(a.id));
    });
  }, [rows, listDateRange]);

  const totalOrders = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);
  const totalProductQuantity = useMemo(() => reportItems.reduce((sum, item) => sum + Number(item.soLuong || 0), 0), [reportItems]);

  const productSummaryInPeriod = useMemo(() => {
    const map = new Map<string, { quantity: number; orders: Set<string> }>();
    reportItems.forEach((item) => {
      const productName = [item.tenKichThuoc || 'Chưa chọn kích thước', item.tenChatLieu || 'Chưa chọn chất liệu'].join(' - ');
      const entry = map.get(productName) || { quantity: 0, orders: new Set<string>() };
      entry.quantity += Number(item.soLuong || 0);
      entry.orders.add(item.printOrderId);
      map.set(productName, entry);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, quantity: value.quantity, orderCount: value.orders.size }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [reportItems]);

  const reportByStatus = useMemo(() => {
    const map = new Map<string, { orders: Set<string>; products: Map<string, number> }>();
    reportItems.forEach((item) => {
      const key = item.tenTrangThai || 'Chưa chọn trạng thái';
      const productName = [item.tenKichThuoc || 'Chưa chọn kích thước', item.tenChatLieu || 'Chưa chọn chất liệu'].join(' - ');
      const entry = map.get(key) || { orders: new Set<string>(), products: new Map<string, number>() };
      entry.orders.add(item.printOrderId);
      entry.products.set(productName, (entry.products.get(productName) || 0) + Number(item.soLuong || 0));
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      totalOrders: value.orders.size,
      products: Array.from(value.products.entries())
        .map(([product, quantity]) => ({ product, quantity }))
        .sort((a, b) => b.quantity - a.quantity),
      totalQuantity: Array.from(value.products.values()).reduce((sum, qty) => sum + qty, 0),
    }));
  }, [reportItems]);

  const reportByVendor = useMemo(() => {
    const map = new Map<string, { orders: Set<string>; products: Map<string, number> }>();
    reportItems.forEach((item) => {
      const key = item.tenXuongIn || 'Chưa chọn xưởng';
      const productName = [item.tenKichThuoc || 'Chưa chọn kích thước', item.tenChatLieu || 'Chưa chọn chất liệu'].join(' - ');
      const entry = map.get(key) || { orders: new Set<string>(), products: new Map<string, number>() };
      entry.orders.add(item.printOrderId);
      entry.products.set(productName, (entry.products.get(productName) || 0) + Number(item.soLuong || 0));
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      totalOrders: value.orders.size,
      products: Array.from(value.products.entries())
        .map(([product, quantity]) => ({ product, quantity }))
        .sort((a, b) => b.quantity - a.quantity),
      totalQuantity: Array.from(value.products.values()).reduce((sum, qty) => sum + qty, 0),
    }));
  }, [reportItems]);

  const computeHeaderStatusFromItems = (forms: Record<string, ItemEditState>) => {
    const items = Object.values(forms);
    if (!items.length) return null;
    const itemStatusIds = items.map((item) => item.itemStatusId).filter(Boolean);
    if (!itemStatusIds.length) return null;
    if (statusIds.traThieuAnh && itemStatusIds.some((id) => id === statusIds.traThieuAnh)) return statusIds.traThieuAnh;
    if (statusIds.daDuAnh && itemStatusIds.length === items.length && itemStatusIds.every((id) => id === statusIds.daDuAnh)) return statusIds.daDuAnh;
    return null;
  };

  const openEditModal = async (row: PrintOrder) => { setEditingRow(row); setHeaderForm(createHeaderFormFromRow(row)); setOrderItems([]); setItemForms({}); await loadOrderItems(row.id); };
  const closeEditModal = () => { setEditingRow(null); setHeaderForm(null); setOrderItems([]); setItemForms({}); setIsSavingModal(false); setIsAddingItem(false); };
  const openCreateModal = () => { const defaultStatusId = catalogs.statuses.find((item) => item.name === 'ĐANG IN ẤN')?.id || ''; setCreateForm({ tenKhachHang: '', ngayGuiIn: new Date().toISOString().slice(0, 10), statusId: defaultStatusId }); setIsCreateModalOpen(true); };
  const closeCreateModal = () => { setIsCreateModalOpen(false); setIsAddingOrder(false); };

  const handleAddOrder = async () => {
    setIsAddingOrder(true); setError(null);
    try {
      await createPrintOrder({ tenKhachHang: createForm.tenKhachHang || 'Khách mới', ngayGuiIn: createForm.ngayGuiIn || new Date().toISOString().slice(0, 10), statusId: createForm.statusId || null });
      setSuccessMessage('Đã tạo đơn in mới.'); closeCreateModal(); await loadData();
    } catch (e: any) {
      console.error('Create print order error:', e); setError(e?.message || 'Không tạo được đơn in mới.');
    } finally { setIsAddingOrder(false); }
  };

  const handleDuplicateOrder = async (row: PrintOrder) => {
    if (!canDuplicateOrder) return;
    setRowSaving(row.id, true); setError(null);
    try { await duplicatePrintOrder(row); setSuccessMessage('Đã nhân bản đơn in.'); await loadData(); }
    catch (e: any) { console.error('Duplicate print order error:', e); setError(e?.message || 'Không nhân bản được đơn in.'); }
    finally { setRowSaving(row.id, false); }
  };

  const handleDeleteOrder = async (row: PrintOrder) => {
    if (!canDeleteOrder) return;
    const confirmed = window.confirm(`Bạn có chắc muốn ẩn đơn in của "${row.tenKhachHang}"?`); if (!confirmed) return;
    setRowSaving(row.id, true); setError(null);
    try { await softDeletePrintOrder(row.id); setSuccessMessage('Đã xóa mềm đơn in.'); await loadData(); }
    catch (e: any) { console.error('Delete print order error:', e); setError(e?.message || 'Không xóa được đơn in.'); }
    finally { setRowSaving(row.id, false); }
  };

  const handleSaveHeader = async () => {
    if (!headerForm) return;
    setIsSavingModal(true); setError(null);
    try {
      const patch: Record<string, any> = { status_id: headerForm.statusId || null, nguoi_kiem_tra_nhan_anh: headerForm.nguoiKiemTraNhanAnh || null, ghi_chu: headerForm.ghiChu || '', link_files: headerForm.linkFiles || '' };
      if (canEditProtectedFields) { patch.ten_khach_hang = headerForm.tenKhachHang || ''; patch.ngay_gui_in = headerForm.ngayGuiIn || null; }
      await updatePrintOrder(headerForm.id, patch);
      setSuccessMessage('Đã cập nhật thông tin đơn in.'); await loadData();
    } catch (e: any) {
      console.error('Update print order header error:', e); setError(e?.message || 'Không cập nhật được đơn in.');
    } finally { setIsSavingModal(false); }
  };

  const handleAddItem = async () => {
    if (!editingRow || !supabase) return;
    setIsAddingItem(true); setError(null);
    try {
      const nextSort = orderItems.length > 0 ? Math.max(...orderItems.map((item) => Number(item.thuTuHienThi || 0))) + 1 : 1;
      const defaultItemStatus = statusIds.dangInAn || headerForm?.statusId || null;
      const { error: insertError } = await supabase.from('print_order_items').insert({ print_order_id: editingRow.id, so_luong: 0, size_id: null, material_id: null, vendor_id: editingRow.vendorId || null, status_id: defaultItemStatus, don_gia_in: 0, ghi_chu: '', thu_tu_hien_thi: nextSort, dang_su_dung: true });
      if (insertError) throw insertError;
      setSuccessMessage('Đã thêm dòng sản phẩm in.'); await loadOrderItems(editingRow.id);
    } catch (e: any) {
      console.error('Add print order item error:', e); setError(e?.message || 'Không thêm được dòng sản phẩm in.');
    } finally { setIsAddingItem(false); }
  };

  const handleDuplicateItem = async (item: ModalItemRow) => {
    if (!supabase) return;
    setItemSaving(item.id, true); setError(null);
    try {
      const nextSort = orderItems.length > 0 ? Math.max(...orderItems.map((row) => Number(row.thuTuHienThi || 0))) + 1 : Number(item.thuTuHienThi || 0) + 1;
      const { error: duplicateError } = await supabase.from('print_order_items').insert({ print_order_id: item.printOrderId, so_luong: Number(item.soLuong || 0), size_id: item.sizeId || null, material_id: item.materialId || null, vendor_id: item.vendorId || null, status_id: item.itemStatusId || item.statusId || null, don_gia_in: Number(item.donGiaIn || 0), ghi_chu: item.ghiChuItem || '', thu_tu_hien_thi: nextSort, dang_su_dung: true });
      if (duplicateError) throw duplicateError;
      setSuccessMessage('Đã nhân bản dòng sản phẩm in.'); await loadOrderItems(item.printOrderId);
    } catch (e: any) {
      console.error('Duplicate print order item error:', e); setError(e?.message || 'Không nhân bản được dòng sản phẩm in.');
    } finally { setItemSaving(item.id, false); }
  };

  const handleDeleteItem = async (item: ModalItemRow) => {
    if (!canDeleteOrder || !supabase) return;
    const confirmed = window.confirm('Bạn có chắc muốn ẩn dòng sản phẩm in này?'); if (!confirmed) return;
    setItemSaving(item.id, true); setError(null);
    try {
      const { error: deleteError } = await supabase.from('print_order_items').update({ dang_su_dung: false }).eq('id', item.id);
      if (deleteError) throw deleteError;
      setSuccessMessage('Đã xóa mềm dòng sản phẩm in.'); await loadOrderItems(item.printOrderId);
    } catch (e: any) {
      console.error('Delete print order item error:', e); setError(e?.message || 'Không xóa được dòng sản phẩm in.');
    } finally { setItemSaving(item.id, false); }
  };

  const handleSaveItem = async (itemId: string) => {
    if (!supabase || !editingRow || !headerForm) return;
    const form = itemForms[itemId]; if (!form) return;
    setItemSaving(itemId, true); setError(null);
    try {
      const { error: updateError } = await supabase.from('print_order_items').update({ so_luong: toNonNegativeNumber(form.soLuong), size_id: form.sizeId || null, material_id: form.materialId || null, vendor_id: form.vendorId || null, status_id: form.itemStatusId || null, don_gia_in: Number(form.donGiaIn || 0) }).eq('id', itemId);
      if (updateError) throw updateError;
      const nextForms = { ...itemForms, [itemId]: form };
      const autoHeaderStatus = computeHeaderStatusFromItems(nextForms);
      if (autoHeaderStatus && autoHeaderStatus !== headerForm.statusId) {
        await updatePrintOrder(editingRow.id, { status_id: autoHeaderStatus });
        setHeaderForm((prev) => (prev ? { ...prev, statusId: autoHeaderStatus } : prev));
      }
      setSuccessMessage('Đã lưu sản phẩm in.'); await loadOrderItems(editingRow.id); await loadData();
    } catch (e: any) {
      console.error('Update print order item error:', e); setError(e?.message || 'Không cập nhật được sản phẩm in.');
    } finally { setItemSaving(itemId, false); }
  };

  return <div className="space-y-6 p-6">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm"><Printer size={24} /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Module Báo Cáo In Ấn</h1><p className="mt-1 text-sm text-gray-500">Danh sách chính hiển thị theo đơn in tổng. Bên trong modal quản lý nhiều dòng sản phẩm in.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setActiveTab('list')} className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>Danh sách in ấn</button>
          <button type="button" onClick={() => setActiveTab('report')} className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'report' ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}>Báo cáo in ấn</button>
        </div>
      </div>
    </div>
    {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div>{error}</div></div>}
    {successMessage && <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><div>{successMessage}</div></div>}

    {activeTab === 'list' && <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2"><ClipboardList size={18} className="text-gray-500" /><h2 className="text-base font-semibold text-gray-800">Danh sách đơn in tổng</h2></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={openCreateModal} disabled={isAddingOrder || isLoading || !isConfigured} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">{isAddingOrder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Thêm mới đơn in</button>
            <button type="button" onClick={() => void loadData()} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />Làm mới</button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
            <input type="date" value={listDateRange.from} onChange={(e) => setListDateRange((prev) => ({ ...prev, from: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
            <input type="date" value={listDateRange.to} onChange={(e) => setListDateRange((prev) => ({ ...prev, to: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={() => setListDateRange({ from: '', to: '' })} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
              Xóa lọc ngày
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[1350px] w-full"><thead className="bg-amber-200"><tr className="text-sm font-semibold text-gray-900"><th className="px-3 py-3 text-left">Ngày gửi in</th><th className="px-3 py-3 text-left">Tên Khách Hàng</th><th className="px-3 py-3 text-left">Mã HĐ</th><th className="px-3 py-3 text-left">TÌNH TRẠNG</th><th className="px-3 py-3 text-left">XƯỞNG IN</th><th className="px-3 py-3 text-left">NGƯỜI KIỂM TRA NHẬN ẢNH</th><th className="px-3 py-3 text-left">Link file</th><th className="px-3 py-3 text-left">GHI CHÚ</th><th className="px-3 py-3 text-left">Thao tác</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-6 py-14"><div className="flex items-center justify-center gap-3 text-sm text-gray-500"><Loader2 size={18} className="animate-spin" />Đang tải dữ liệu đơn in từ Supabase...</div></td></tr>}
            {!isLoading && paginatedRows.map((row) => {
              const isSavingRow = !!savingMap[row.id];
              return <tr key={row.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => void openEditModal(row)}>
                <td className="min-w-[140px] px-3 py-3 text-sm text-gray-700">{row.ngayGuiIn || ''}</td><td className="min-w-[220px] px-3 py-3 text-sm text-gray-900">{row.tenKhachHang}</td><td className="min-w-[120px] px-3 py-3 text-sm text-gray-700">{row.contractCode || ''}</td><td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenTrangThai || ''}</td><td className="min-w-[150px] px-3 py-3 text-sm text-gray-700">{row.tenXuongIn || ''}</td><td className="min-w-[180px] px-3 py-3 text-sm text-gray-700">{row.nguoiKiemTraNhanAnh || ''}</td><td className="min-w-[220px] px-3 py-3 text-sm text-gray-700 truncate">{row.linkFiles || ''}</td><td className="min-w-[220px] px-3 py-3 text-sm text-gray-700">{row.ghiChu || ''}</td>
                <td className="min-w-[130px] px-3 py-3" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-2">{isSavingRow && <Loader2 size={15} className="animate-spin text-blue-600" />}<button type="button" onClick={() => void openEditModal(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Sửa" disabled={isSavingRow}><Pencil size={15} /></button>{canDuplicateOrder && <button type="button" onClick={() => void handleDuplicateOrder(row)} className="rounded-lg border border-gray-300 p-2 text-gray-700" title="Nhân bản đơn" disabled={isSavingRow}><Copy size={15} /></button>}{canDeleteOrder && <button type="button" onClick={() => void handleDeleteOrder(row)} className="rounded-lg border border-red-200 p-2 text-red-600" title="Xóa đơn" disabled={isSavingRow}><Trash2 size={15} /></button>}</div></td>
              </tr>;
            })}
            {!isLoading && filteredRows.length === 0 && <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">Chưa có dữ liệu đơn in trong Supabase.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">Hiển thị {(filteredRows.length === 0) ? 0 : ((currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, filteredRows.length)} trên {filteredRows.length} đơn in</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Trang trước</button>
          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Trang {currentPage}/{totalPages}</div>
          <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Trang sau</button>
        </div>
      </div>
    </>}

    {activeTab === 'report' && <>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Filter size={18} className="text-gray-500" /><h2 className="text-base font-semibold text-gray-800">Bộ lọc báo cáo</h2></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div><label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" /></div>
          <div><label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" /></div>
          <div className="flex items-end"><button type="button" onClick={() => { void loadData(); void loadReportItems(); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />Tải báo cáo</button></div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Tổng đơn in trong kỳ</div><div className="mt-2 text-3xl font-bold text-gray-900">{totalOrders}</div></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="text-sm text-gray-500">Tổng số lượng sản phẩm in trong kỳ</div><div className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(totalProductQuantity)}</div></div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-gray-500" /><h2 className="text-base font-semibold text-gray-800">Tổng hợp số lượng theo sản phẩm in trong kỳ</h2></div>
        <div className="space-y-3">
          {productSummaryInPeriod.map((item) => <div key={item.name} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"><div><div className="text-sm font-semibold text-gray-800">{item.name}</div><div className="text-xs text-gray-500">{item.orderCount} đơn</div></div><div className="text-lg font-bold text-gray-900">{formatNumber(item.quantity)}</div></div>)}
          {productSummaryInPeriod.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">Chưa có dữ liệu sản phẩm in theo khoảng ngày đã chọn.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-gray-500" /><h2 className="text-base font-semibold text-gray-800">Tổng hợp theo trạng thái</h2></div>
          <div className="space-y-4">
            {reportByStatus.map((item) => <div key={item.name} className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-gray-800">{item.name}</div><div className="text-xs text-gray-500">{item.totalOrders} đơn • {formatNumber(item.totalQuantity)} sản phẩm</div></div></div><div className="mt-3 space-y-2">{item.products.map((product) => <div key={product.product} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="text-gray-700">{product.product}</span><span className="font-semibold text-gray-900">{formatNumber(product.quantity)}</span></div>)}</div></div>)}
            {reportByStatus.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">Chưa có dữ liệu theo trạng thái trong kỳ đã chọn.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-gray-500" /><h2 className="text-base font-semibold text-gray-800">Tổng hợp theo xưởng in</h2></div>
          <div className="space-y-4">
            {reportByVendor.map((item) => <div key={item.name} className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-gray-800">{item.name}</div><div className="text-xs text-gray-500">{item.totalOrders} đơn • {formatNumber(item.totalQuantity)} sản phẩm</div></div></div><div className="mt-3 space-y-2">{item.products.map((product) => <div key={product.product} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="text-gray-700">{product.product}</span><span className="font-semibold text-gray-900">{formatNumber(product.quantity)}</span></div>)}</div></div>)}
            {reportByVendor.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">Chưa có dữ liệu theo xưởng in trong kỳ đã chọn.</div>}
          </div>
        </div>
      </div>
    </>}

    {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-xl rounded-2xl bg-white shadow-xl"><div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><div><h3 className="text-lg font-semibold text-gray-900">Tạo đơn in mới</h3><p className="text-sm text-gray-500">Tạo đơn tổng trước, sau đó thêm các dòng sản phẩm in trong modal chi tiết.</p></div><button type="button" onClick={closeCreateModal} className="rounded-lg border border-gray-300 p-2 text-gray-600"><X size={16} /></button></div><div className="grid grid-cols-1 gap-4 px-6 py-6"><div><label className="mb-2 block text-sm font-medium text-gray-700">Tên Khách Hàng</label><input value={createForm.tenKhachHang} onChange={(e) => setCreateForm((prev) => ({ ...prev, tenKhachHang: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" placeholder="Nhập tên khách hàng" /></div><div><label className="mb-2 block text-sm font-medium text-gray-700">Ngày gửi in</label><input type="date" value={createForm.ngayGuiIn} onChange={(e) => setCreateForm((prev) => ({ ...prev, ngayGuiIn: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" /></div><div><label className="mb-2 block text-sm font-medium text-gray-700">TÌNH TRẠNG</label><select value={createForm.statusId} onChange={(e) => setCreateForm((prev) => ({ ...prev, statusId: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm"><option value="">Chọn</option>{catalogs.statuses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div></div><div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4"><button type="button" onClick={closeCreateModal} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700" disabled={isAddingOrder}>Hủy</button><button type="button" onClick={() => void handleAddOrder()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isAddingOrder}>{isAddingOrder && <Loader2 size={16} className="animate-spin" />}Tạo đơn in</button></div></div></div>}

    {editingRow && headerForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-[30px] bg-slate-50 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/95 px-8 py-6 backdrop-blur"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm"><Printer size={24} /></div><div><h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Chỉnh sửa đơn in</h3><p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mã HĐ: {editingRow.contractCode || 'Chưa có mã hợp đồng'}</p></div></div><button type="button" onClick={closeEditModal} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-600"><X size={18} /></button></div>

      <div className="space-y-6 px-8 py-8">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-blue-600"><UserRound size={16} /><span>1. Thông Tin Khách Hàng</span></div>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Tên Khách Hàng</label><input value={headerForm.tenKhachHang} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, tenKhachHang: e.target.value } : prev))} className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium ${canEditProtectedFields ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-100 text-slate-500'}`} disabled={!canEditProtectedFields} /></div>
            <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Ngày Gửi In</label><input type="date" value={headerForm.ngayGuiIn} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, ngayGuiIn: e.target.value } : prev))} className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium ${canEditProtectedFields ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-100 text-slate-500'}`} disabled={!canEditProtectedFields} /></div>
            <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Tình Trạng Chung</label><select value={headerForm.statusId} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, statusId: e.target.value } : prev))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium"><option value="">Chọn</option>{catalogs.statuses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-emerald-600"><Layers3 size={16} /><span>2. Sản phẩm in</span></div><button type="button" onClick={() => void handleAddItem()} disabled={isAddingItem} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{isAddingItem ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Thêm mới sản phẩm in</button></div>

          <div className="mt-5">{loadingItems ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Đang tải danh sách dòng sản phẩm in...</div> : orderItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Đơn này chưa có dòng sản phẩm in. Hãy bấm “Thêm mới sản phẩm in”.</div> : <div className="space-y-4">
            {orderItems.map((item, index) => {
              const form = itemForms[item.id]; const isSavingItem = !!itemSavingMap[item.id]; if (!form) return null;
              return <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Sản phẩm in #{index + 1}</div><div className="flex items-center gap-2">{isSavingItem && <Loader2 size={15} className="animate-spin text-blue-600" />}<button type="button" onClick={() => void handleDuplicateItem(item)} className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700" title="Nhân bản dòng" disabled={isSavingItem}><Copy size={15} /></button>{canDeleteOrder && <button type="button" onClick={() => void handleDeleteItem(item)} className="rounded-xl border border-red-200 bg-white p-2.5 text-red-600" title="Xóa dòng" disabled={isSavingItem}><Trash2 size={15} /></button>}</div></div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                  <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Kích Thước</label><select value={form.sizeId} onChange={(e) => { void handleItemFieldChange(item.id, 'sizeId', e.target.value); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium"><option value="">Chọn</option>{catalogs.sizes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
                  <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Chất Liệu</label><select value={form.materialId} onChange={(e) => { void handleItemFieldChange(item.id, 'materialId', e.target.value); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium"><option value="">Chọn</option>{catalogs.materials.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
                  <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Số Lượng</label><input type="number" min={0} value={form.soLuong} onChange={(e) => { void handleItemFieldChange(item.id, 'soLuong', toNonNegativeNumber(e.target.value)); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium" /></div>
                  <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Xưởng In</label><select value={form.vendorId} onChange={(e) => { void handleItemFieldChange(item.id, 'vendorId', e.target.value); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium"><option value="">Chọn</option>{catalogs.vendors.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
                  <div><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Tình Trạng</label><select value={form.itemStatusId} onChange={(e) => { void handleItemFieldChange(item.id, 'itemStatusId', e.target.value); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium"><option value="">Chọn</option>{catalogs.statuses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-500">
                    Đơn giá tự tra theo bảng giá in: <span className="font-semibold text-slate-700">{formatNumber(form.donGiaIn || 0)}đ</span>
                  </div>
                  <button type="button" onClick={() => void handleSaveItem(item.id)} disabled={isSavingItem} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{isSavingItem && <Loader2 size={16} className="animate-spin" />}Lưu sản phẩm</button>
                </div>
              </div>;
            })}
          </div>}</div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-amber-600"><UserRound size={16} /><span>3. Người Kiểm Tra Ảnh</span></div>
          <div className="mt-5">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Người Kiểm Tra Ảnh</label>
            <select value={headerForm.nguoiKiemTraNhanAnh} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, nguoiKiemTraNhanAnh: e.target.value } : prev))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium">
              <option value="">Chọn</option>
              {staffOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-cyan-600"><LinkIcon size={16} /><span>4. Link File In</span></div>
          <div className="mt-5"><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Link File In</label><input value={headerForm.linkFiles} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, linkFiles: e.target.value } : prev))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium" /></div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-violet-600"><FileText size={16} /><span>5. Ghi Chú</span></div>
          <div className="mt-5"><label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Ghi Chú Đơn In</label><textarea value={headerForm.ghiChu} onChange={(e) => setHeaderForm((prev) => (prev ? { ...prev, ghiChu: e.target.value } : prev))} rows={4} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium" /></div>
        </section>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-8 py-6"><div className="text-xs font-medium text-slate-500">{!canEditProtectedFields ? 'User thường chỉ được sửa các trường vận hành. Tên khách hàng và ngày gửi in chỉ Admin/Giám đốc được sửa.' : 'Admin/Giám đốc được sửa toàn bộ trường.'}</div><div className="flex items-center gap-3"><button type="button" onClick={closeEditModal} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700" disabled={isSavingModal}>Hủy</button><button type="button" onClick={() => void handleSaveHeader()} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={isSavingModal}>{isSavingModal && <Loader2 size={16} className="animate-spin" />}Lưu thông tin đơn in</button></div></div>
    </div></div>}
  </div>;
};

export default PrintProductionManager;
