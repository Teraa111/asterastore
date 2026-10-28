import React, { useState, useEffect, useMemo } from 'react';
import { ProductCatalog, Order, PromoCode, DenominationItem, AccountCredential } from '../types/store';
import {
  loadProducts,
  saveProducts,
  loadOrders,
  loadAdminOrders,
  saveOrders,
  fetchOrdersFromServer,
  loadPromos,
  savePromos,
  calculateMetrics,
  adminVerifyAndFulfillOrder,
  adminMarkOrderExpired,
  adminCancelOrder,
  adminDeleteOrder,
  adminDeleteAllOrders,
  getOrderStatusDetails,
  triggerAutomaticFulfillment,
  getAdminPin,
  setAdminPin,
  getPaymentConfig,
  savePaymentConfig,
  AdminPaymentConfig,
  getStoreAssets,
  saveStoreAssets,
  StoreAssetsConfig,
  DEFAULT_STORE_ASSETS,
  syncAllProductsToCloud,
  getDenomReadyStock,
  fetchProductsFromCloudServer,
  syncAccountVaultFromCloud,
} from '../utils/storage';
import {
  isSupabaseConfigured,
  addAccountToVaultSupabase,
  checkSupabaseStatus,
  SUPABASE_SETUP_SQL,
  getSupabaseConfig,
  setCustomSupabaseConfig,
  refreshSupabaseClient,
} from '../utils/supabase';
import { formatIDR, formatNumber } from '../utils/currency';
import { INITIAL_PRODUCTS, HERO_PROMO_IMG, MLBB_COVER_IMG } from '../data/mockData';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Ticket,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  X,
  Key,
  UserCheck,
  Coins,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  Zap,
  ArrowRight,
  HelpCircle,
  Layers,
  FileText,
  Lock,
  LogOut,
  KeyRound,
  Power,
  Ban,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Palette,
  ImageIcon,
  Sparkles,
  QrCode,
  Smartphone,
  Upload,
  ExternalLink,
  Receipt,
  Database,
  Terminal,
} from 'lucide-react';

interface AdminInventoryProps {
  onLogout?: () => void;
  onBackToStore?: () => void;
  onOpenInvoice?: (order: Order) => void;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  onLogout,
  onBackToStore,
  onOpenInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'bbcoin' | 'orders' | 'promos' | 'media' | 'qris' | 'guide'>('accounts');

  // Core data states
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);

  // Store Assets & Photos states
  const [storeAssets, setStoreAssets] = useState<StoreAssetsConfig>(getStoreAssets());
  const [heroInput, setHeroInput] = useState(storeAssets.heroBannerImg);
  const [accountCoverInput, setAccountCoverInput] = useState(storeAssets.accountProductImg);
  const [bbcoinCoverInput, setBbcoinCoverInput] = useState(storeAssets.bbcoinProductImg);
  const [storeLogoInput, setStoreLogoInput] = useState(storeAssets.storeLogoImg || '');

  // Payment Config & DANA QRIS states
  const [paymentConfig, setPaymentConfig] = useState<AdminPaymentConfig>(getPaymentConfig());
  const [qrisImageInput, setQrisImageInput] = useState(paymentConfig.qrisCustomImageUrl || '');
  const [danaNumberInput, setDanaNumberInput] = useState(paymentConfig.danaNumber);
  const [danaNameInput, setDanaNameInput] = useState(paymentConfig.danaAccountName);
  const [adminPhoneInput, setAdminPhoneInput] = useState(paymentConfig.adminPhone);
  const [qrisNmidInput, setQrisNmidInput] = useState(paymentConfig.qrisNmid);

  // Filtering & Search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Modals & Forms
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedDenomForAccount, setSelectedDenomForAccount] = useState<string>('acc-advance-fresh');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccServer, setNewAccServer] = useState('Server 5701 (Advance Server)');
  const [newAccLevel, setNewAccLevel] = useState(8);
  const [newAccNotes, setNewAccNotes] = useState('Akun Advance Server siap pakai.');

  const [editingItem, setEditingItem] = useState<{ productId: string; item: DenominationItem } | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Edit Account Credential states (Ubah Email / Password / Server / Notes / Denom)
  const [editingAccount, setEditingAccount] = useState<{
    productId: string;
    currentDenomId: string;
    targetDenomId: string;
    account: AccountCredential;
  } | null>(null);
  const [showEditAccPassword, setShowEditAccPassword] = useState(false);
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);

  // Edit Product Display states (Judul, Subjudul, Badge, Gambar Cover, Deskripsi Menu Utama)
  const [editingProductDisplay, setEditingProductDisplay] = useState<ProductCatalog | null>(null);

  // PIN Management states
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // Supabase Database Diagnostic & SQL Setup states
  const [supabaseDiag, setSupabaseDiag] = useState<{
    configured: boolean;
    connected: boolean;
    tablesExist: boolean;
    errorMessage?: string;
  } | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const runSupabaseCheck = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await checkSupabaseStatus();
      setSupabaseDiag(res);
    } catch (e: any) {
      setSupabaseDiag({
        configured: isSupabaseConfigured(),
        connected: false,
        tablesExist: false,
        errorMessage: e?.message || 'Gagal mengecek Supabase',
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const [customSbUrl, setCustomSbUrl] = useState(() => getSupabaseConfig().url);
  const [customSbKey, setCustomSbKey] = useState(() => getSupabaseConfig().anonKey);
  const [showCustomConfigForm, setShowCustomConfigForm] = useState(false);

  const handleSaveCustomSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomSupabaseConfig(customSbUrl.trim(), customSbKey.trim());
    refreshSupabaseClient();
    showToast('Kredensial Supabase berhasil disimpan! Mengecek koneksi...', 'success');
    runSupabaseCheck();
  };

  // Status Action Toast Notification
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToastNotice({ message, type });
    setTimeout(() => {
      setToastNotice(null);
    }, 4500);
  };

  // Sync from storage
  const refreshData = () => {
    setProducts(loadProducts());
    setOrders(loadAdminOrders());
    setPromos(loadPromos());
  };

  useEffect(() => {
    refreshData();
    runSupabaseCheck();
    syncAccountVaultFromCloud().catch(() => {});
    const handleSync = () => {
      refreshData();
      runSupabaseCheck();
    };
    window.addEventListener('storeadv_products_updated', handleSync);
    window.addEventListener('storeadv_orders_updated', handleSync);
    window.addEventListener('storeadv_promos_updated', handleSync);

    // Real-time sync: poll server orders, products & cloud vault every 3 seconds
    const pollTimer = setInterval(() => {
      fetchOrdersFromServer();
      fetchProductsFromCloudServer().catch(() => {});
      syncAccountVaultFromCloud().catch(() => {});
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('storeadv_products_updated', handleSync);
      window.removeEventListener('storeadv_orders_updated', handleSync);
      window.removeEventListener('storeadv_promos_updated', handleSync);
    };
  }, []);

  const metrics = useMemo(() => calculateMetrics(orders, products), [orders, products]);

  // Account product reference
  const accountProduct = useMemo(() => {
    return products.find((p) => p.type === 'advance_account');
  }, [products]);

  // BB Coin product reference
  const bbCoinProduct = useMemo(() => {
    return products.find((p) => p.type === 'bbcoin_diamond');
  }, [products]);

  // Count orders waiting verification
  const waitingVerificationCount = useMemo(() => {
    return orders.filter((o) => o.status === 'WAITING_VERIFICATION').length;
  }, [orders]);

  // Admin verifies payment after checking real DANA / bank mutations
  const handleAdminVerifyOrder = (orderId: string) => {
    const res = adminVerifyAndFulfillOrder(orderId, 'Admin ASTERA STORE');
    if (res.success) {
      showToast(res.message, 'success');
      refreshData();
      if (selectedOrderDetails?.id === orderId && res.order) {
        setSelectedOrderDetails(res.order);
      }
    } else {
      showToast(res.message, 'warning');
    }
  };

  // Admin marks order as expired
  const handleAdminMarkExpired = (orderId: string) => {
    if (!window.confirm(`Tandai pesanan ${orderId} sebagai Kedaluwarsa?`)) return;
    const res = adminMarkOrderExpired(orderId);
    if (res) {
      showToast(`Pesanan ${orderId} ditandai Kedaluwarsa.`, 'warning');
      refreshData();
      if (selectedOrderDetails?.id === orderId) {
        setSelectedOrderDetails(res);
      }
    }
  };

  // Admin cancels order
  const handleAdminCancelOrder = (orderId: string) => {
    const reason = window.prompt(`Masukkan alasan pembatalan pesanan ${orderId}:`, 'Dana tidak masuk / Fraud');
    if (reason === null) return;
    const res = adminCancelOrder(orderId, reason);
    if (res) {
      showToast(`Pesanan ${orderId} berhasil dibatalkan.`, 'warning');
      refreshData();
      if (selectedOrderDetails?.id === orderId) {
        setSelectedOrderDetails(res);
      }
    }
  };

  // Admin deletes single order permanently
  const handleAdminDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Yakin ingin menghapus pesanan ${orderId} secara permanen dari database cloud & riwayat?`)) {
      return;
    }
    await adminDeleteOrder(orderId);
    if (selectedOrderDetails?.id === orderId) {
      setSelectedOrderDetails(null);
    }
    refreshData();
    showToast(`Pesanan ${orderId} berhasil dihapus permanen dari database!`, 'success');
  };

  // Admin deletes all orders permanently (Reset test orders)
  const handleAdminDeleteAllOrders = async () => {
    if (!window.confirm('PERINGATAN: Yakin ingin MENGHAPUS SEMUA PESANAN dari database cloud & sistem? Tindakan ini akan mengosongkan seluruh riwayat transaksi.')) {
      return;
    }
    await adminDeleteAllOrders();
    setSelectedOrderDetails(null);
    refreshData();
    showToast('Seluruh riwayat pesanan berhasil dibersihkan dari database cloud!', 'success');
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const q = orderSearchQuery.toLowerCase();
      const matchQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.userId && o.userId.toLowerCase().includes(q)) ||
        o.whatsapp.includes(q) ||
        o.itemName.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Add new account to pool
  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccEmail.trim() || !newAccPassword.trim()) return;

    const updated = products.map((prod) => {
      if (prod.type === 'advance_account') {
        return {
          ...prod,
          denominations: prod.denominations.map((denom) => {
            if (denom.id === selectedDenomForAccount) {
              const currentPool = denom.accountPool || [];
              const newCredential: AccountCredential = {
                id: `acc-${Date.now()}`,
                email: newAccEmail.trim(),
                password: newAccPassword.trim(),
                serverInfo: newAccServer.trim(),
                bindType: 'Moonton Sepaket Email',
                level: Number(newAccLevel),
                notes: newAccNotes.trim(),
                isSold: false,
                createdAt: new Date().toISOString(),
              };
              const newPool = [...currentPool, newCredential];
              return {
                ...denom,
                accountPool: newPool,
                stockCount: newPool.filter((a) => !a.isSold).length,
              };
            }
            return denom;
          }),
        };
      }
      return prod;
    });

    saveProducts(updated);
    setProducts(updated);

    // Sync to Supabase Account Vault
    if (isSupabaseConfigured()) {
      addAccountToVaultSupabase(selectedDenomForAccount, {
        email: newAccEmail.trim(),
        password: newAccPassword.trim(),
        serverInfo: newAccServer.trim(),
        bindType: 'Moonton Sepaket Email',
        level: Number(newAccLevel),
        notes: newAccNotes.trim(),
      }).catch((err) => {
        console.warn('Sync to Supabase vault note:', err);
      });
    }

    setNewAccEmail('');
    setNewAccPassword('');
    setShowAddAccountModal(false);
    showToast('Akun baru berhasil disimpan ke brankas database cloud Firestore!', 'success');
  };

  // Open Edit Account Modal (Ubah email, password, server, level jika salah ketik)
  const handleOpenEditAccount = (productId: string, denomId: string, account: AccountCredential) => {
    setEditingAccount({
      productId,
      currentDenomId: denomId,
      targetDenomId: denomId,
      account: { ...account },
    });
    setShowEditAccPassword(false);
  };

  // Save Account Credential Edit (Email / Password / Server / Notes / Move Denom)
  const handleSaveAccountEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const { productId, currentDenomId, targetDenomId, account } = editingAccount;
    const cleanEmail = account.email.trim();
    const cleanPassword = account.password.trim();

    if (!cleanEmail || !cleanPassword) {
      showToast('Email dan Password akun Moonton tidak boleh kosong!', 'warning');
      return;
    }

    const updatedAccount: AccountCredential = {
      ...account,
      email: cleanEmail,
      password: cleanPassword,
      serverInfo: (account.serverInfo || '').trim(),
      notes: (account.notes || '').trim(),
      level: Number(account.level) || 8,
    };

    const updated = products.map((prod) => {
      if (prod.id !== productId) return prod;

      // Case A: Moved to another denomination package
      if (currentDenomId !== targetDenomId) {
        return {
          ...prod,
          denominations: prod.denominations.map((denom) => {
            if (denom.id === currentDenomId) {
              const newPool = (denom.accountPool || []).filter((a) => a.id !== updatedAccount.id);
              return {
                ...denom,
                accountPool: newPool,
                stockCount: newPool.filter((a) => !a.isSold).length,
              };
            }
            if (denom.id === targetDenomId) {
              const newPool = [...(denom.accountPool || []), updatedAccount];
              return {
                ...denom,
                accountPool: newPool,
                stockCount: newPool.filter((a) => !a.isSold).length,
              };
            }
            return denom;
          }),
        };
      }

      // Case B: Same denomination package (update email/password/details in place)
      return {
        ...prod,
        denominations: prod.denominations.map((denom) => {
          if (denom.id === currentDenomId) {
            const newPool = (denom.accountPool || []).map((a) =>
              a.id === updatedAccount.id ? updatedAccount : a
            );
            return {
              ...denom,
              accountPool: newPool,
              stockCount: newPool.filter((a) => !a.isSold).length,
            };
          }
          return denom;
        }),
      };
    });

    saveProducts(updated);
    setProducts(updated);
    setEditingAccount(null);
    showToast(`✅ Kredensial akun (${cleanEmail}) berhasil diperbarui!`, 'success');
  };

  // Delete Account from Pool
  const handleDeleteAccount = (productId: string, denomId: string, accountId: string, email: string) => {
    if (!window.confirm(`Yakin ingin menghapus akun (${email}) dari brankas stok?`)) {
      return;
    }

    const updated = products.map((prod) => {
      if (prod.id !== productId) return prod;
      return {
        ...prod,
        denominations: prod.denominations.map((denom) => {
          if (denom.id === denomId) {
            const newPool = (denom.accountPool || []).filter((a) => a.id !== accountId);
            return {
              ...denom,
              accountPool: newPool,
              stockCount: newPool.filter((a) => !a.isSold).length,
            };
          }
          return denom;
        }),
      };
    });

    saveProducts(updated);
    setProducts(updated);
    if (editingAccount?.account.id === accountId) {
      setEditingAccount(null);
    }
    showToast(`Akun (${email}) berhasil dihapus dari brankas stok.`, 'warning');
  };

  // Quick Copy Helper
  const handleQuickCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccId(id);
    setTimeout(() => setCopiedAccId(null), 2000);
  };

  // Open Edit Product Display Modal (Ganti judul, subjudul, badge, gambar cover, deskripsi)
  const handleOpenEditProductDisplay = (prod: ProductCatalog) => {
    setEditingProductDisplay({ ...prod });
  };

  // Save Product Display Customization
  const handleSaveProductDisplay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductDisplay) return;

    if (!editingProductDisplay.title.trim()) {
      showToast('Judul produk tidak boleh kosong!', 'warning');
      return;
    }

    const updated = products.map((p) => {
      if (p.id === editingProductDisplay.id) {
        return {
          ...p,
          title: editingProductDisplay.title.trim(),
          subtitle: editingProductDisplay.subtitle.trim(),
          badge: editingProductDisplay.badge.trim(),
          publisher: editingProductDisplay.publisher.trim(),
          coverImage: editingProductDisplay.coverImage.trim() || p.coverImage,
          shortDesc: editingProductDisplay.shortDesc.trim(),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    setEditingProductDisplay(null);
    showToast(`✅ Display produk "${editingProductDisplay.title}" berhasil disimpan!`, 'success');
  };

  // Reset Product Display to Default
  const handleResetProductDisplay = (productId: string) => {
    const defaultProduct = INITIAL_PRODUCTS.find((p) => p.id === productId);
    if (!defaultProduct) return;

    if (!window.confirm(`Kembalikan tampilan display "${defaultProduct.title}" ke pengaturan default awal?`)) {
      return;
    }

    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          title: defaultProduct.title,
          subtitle: defaultProduct.subtitle,
          badge: defaultProduct.badge,
          publisher: defaultProduct.publisher,
          coverImage: defaultProduct.coverImage,
          shortDesc: defaultProduct.shortDesc,
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    setEditingProductDisplay(null);
    showToast(`Tampilan produk telah dikembalikan ke default bawaan.`, 'success');
  };

  // Save Item Price Edit
  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const cleanSell = Math.max(1000, Number(editingItem.item.priceSell) || 0);
    const cleanBase = Math.max(0, Number(editingItem.item.priceBase) || 0);

    const sanitizedItem = {
      ...editingItem.item,
      priceSell: cleanSell,
      priceBase: cleanBase,
    };

    const updated = products.map((p) => {
      if (p.id === editingItem.productId) {
        return {
          ...p,
          denominations: p.denominations.map((d) => {
            if (d.id === sanitizedItem.id) {
              return sanitizedItem;
            }
            return d;
          }),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    setEditingItem(null);

    try {
      const syncRes = await syncAllProductsToCloud(updated);
      if (syncRes.success) {
        showToast(`✅ Harga ${sanitizedItem.name} berhasil diubah jadi ${formatIDR(cleanSell)} dan tersinkron ke cloud!`, 'success');
      } else {
        showToast(`Harga tersimpan lokal. Catatan cloud: ${syncRes.supabaseError || syncRes.firestoreError || 'Menunggu koneksi'}`, 'warning');
      }
    } catch {
      showToast('Perubahan produk & harga berhasil disimpan ke database!', 'success');
    }
  };

  // Toggle Entire Product Status (Matikan Penjualan Toko / Buka Kembali)
  const handleToggleProductStatus = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const nextStatus = p.isActive === false ? true : false;
        return {
          ...p,
          isActive: nextStatus,
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    const target = updated.find((p) => p.id === productId);
    if (target?.isActive === false) {
      showToast(`🔴 Produk "${target.title}" BERHASIL DIMATIKAN! Pembeli di website tidak bisa memesan produk ini karena stok kosong.`, 'warning');
    } else {
      showToast(`🟢 Produk "${target?.title}" BERHASIL DIAKTIFKAN KEMBALI! Penjualan toko dibuka kembali.`, 'success');
    }
  };

  // Toggle Specific Package / Denomination Status
  const handleToggleDenomStatus = (productId: string, denomId: string) => {
    let affectedName = '';
    let newStatus = true;

    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          denominations: p.denominations.map((d) => {
            if (d.id === denomId) {
              affectedName = d.name;
              newStatus = d.isActive === false ? true : false;
              return {
                ...d,
                isActive: newStatus,
              };
            }
            return d;
          }),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);

    if (!newStatus) {
      showToast(`🔴 Paket "${affectedName}" BERHASIL DIMATIKAN (Stok Kosong). Pembeli tidak bisa memilih paket ini di website.`, 'warning');
    } else {
      showToast(`🟢 Paket "${affectedName}" BERHASIL DIAKTIFKAN KEMBALI (Tersedia untuk pembeli).`, 'success');
    }
  };

  // Auto-disable all denomination packages with 0 ready stock
  const handleAutoDisableEmptyStock = (productId: string) => {
    let disabledCount = 0;
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          denominations: p.denominations.map((d) => {
            const unsold = getDenomReadyStock(d);
            if (unsold <= 0 && d.isActive !== false) {
              disabledCount++;
              return {
                ...d,
                isActive: false,
              };
            }
            return d;
          }),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);

    if (disabledCount > 0) {
      showToast(`⚡ Berhasil mematikan ${disabledCount} paket yang stok akunnya 0! Pembeli tidak bisa order paket kosong ini.`, 'warning');
    } else {
      showToast(`Semua paket yang stoknya 0 sudah dalam status nonaktif.`, 'success');
    }
  };

  // Bulk enable all packages in a product
  const handleEnableAllPackages = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          isActive: true,
          denominations: p.denominations.map((d) => ({
            ...d,
            isActive: true,
          })),
        };
      }
      return p;
    });

    saveProducts(updated);
    setProducts(updated);
    showToast(`🟢 Seluruh paket produk berhasil diaktifkan kembali!`, 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Order ID',
      'Tanggal',
      'Tipe Produk',
      'Paket/Item',
      'User ID/Akun',
      'WhatsApp',
      'Metode Bayar',
      'Total Bayar',
      'Status',
      'Data Akun/SN Terkirim',
    ];

    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString('id-ID'),
      o.productType,
      `"${o.itemName}"`,
      o.userId ? `'${o.userId}` : `"${o.accountDelivered?.email || 'Akun Advance'}"`,
      `'${o.whatsapp}`,
      `"${o.paymentMethodName}"`,
      o.totalAmount,
      o.status,
      o.accountDelivered ? `"${o.accountDelivered.email} / ${o.accountDelivered.password}"` : o.serialNumberDelivery || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ASTERA_STORE_Laporan_Transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const compressImage = (file: File, maxDim = 1280, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const scale = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.trim().length < 4) {
      setPinChangeError('PIN keamanan minimal 4 digit.');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeError('Konfirmasi PIN tidak cocok!');
      return;
    }

    const success = setAdminPin(newPinInput.trim());
    if (success) {
      setPinChangeSuccess(true);
      setPinChangeError('');
      showToast('✅ PIN Keamanan Admin berhasil diubah dan tersimpan di database cloud!', 'success');
      setTimeout(() => {
        setShowChangePinModal(false);
        setPinChangeSuccess(false);
        setNewPinInput('');
        setConfirmPinInput('');
      }, 1200);
    } else {
      setPinChangeError('Gagal menyimpan PIN baru.');
    }
  };

  const handleQrisFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG / PNG / WEBP).', 'warning');
      return;
    }
    try {
      showToast('Mengoptimalkan barcode QRIS...', 'success');
      const optimizedBase64 = await compressImage(file, 1000, 0.9);
      setQrisImageInput(optimizedBase64);
      showToast('✅ Gambar QRIS berhasil dimuat & dioptimalkan! Klik "Simpan Pengaturan".', 'success');
    } catch {
      showToast('Gagal memproses gambar QRIS.', 'warning');
    }
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = savePaymentConfig({
      danaNumber: danaNumberInput.trim() || '0823-1208-8548',
      danaAccountName: danaNameInput.trim() || 'ASTERA STORE',
      adminPhone: adminPhoneInput.trim() || '+62 823-1208-8548',
      adminWhatsappUrl: `https://wa.me/${adminPhoneInput.replace(/[^0-9]/g, '')}`,
      qrisNmid: qrisNmidInput.trim() || 'ID99281726481 (DANA BISNIS ASTERA STORE)',
      qrisCustomImageUrl: qrisImageInput.trim(),
    });
    setPaymentConfig(updated);
    showToast('Pengaturan Pembayaran & Barcode QRIS DANA Admin berhasil disimpan!', 'success');
  };

  const handleAssetFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    fieldLabel: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar yang valid (JPG / PNG / WEBP).', 'warning');
      return;
    }
    try {
      showToast(`Mengoptimalkan foto ${fieldLabel}...`, 'success');
      const optimizedBase64 = await compressImage(file, 1280, 0.82);
      setter(optimizedBase64);
      showToast(`✅ Foto ${fieldLabel} berhasil dimuat & dioptimalkan! Klik "Simpan Semua Foto & Banner".`, 'success');
    } catch {
      showToast('Gagal memproses gambar.', 'warning');
    }
  };

  const handleSaveStoreAssets = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    const normalizeImg = (val: string) => {
      let cleaned = val.trim().replace(/\\/g, '/');
      if (cleaned.startsWith('src/assets/images/')) {
        cleaned = '/' + cleaned.replace(/^src\//, '');
      } else if (cleaned.startsWith('/src/assets/images/')) {
        cleaned = cleaned.replace(/^\/src\//, '/');
      } else if (cleaned.startsWith('assets/images/')) {
        cleaned = '/' + cleaned;
      }
      return cleaned;
    };

    const cleanHero = normalizeImg(heroInput) || DEFAULT_STORE_ASSETS.heroBannerImg;
    const cleanAccount = normalizeImg(accountCoverInput) || DEFAULT_STORE_ASSETS.accountProductImg;
    const cleanBbcoin = normalizeImg(bbcoinCoverInput) || DEFAULT_STORE_ASSETS.bbcoinProductImg;
    const cleanLogo = normalizeImg(storeLogoInput);

    if (cleanHero !== heroInput) setHeroInput(cleanHero);
    if (cleanAccount !== accountCoverInput) setAccountCoverInput(cleanAccount);
    if (cleanBbcoin !== bbcoinCoverInput) setBbcoinCoverInput(cleanBbcoin);

    const updated = saveStoreAssets({
      heroBannerImg: cleanHero,
      accountProductImg: cleanAccount,
      bbcoinProductImg: cleanBbcoin,
      storeLogoImg: cleanLogo,
    });
    setStoreAssets(updated);
    showToast('✅ Perubahan banner & foto toko berhasil disimpan dan disinkronkan ke cloud!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 font-bold text-xs tracking-wider uppercase">
              ASTERA STORE Enterprise Portal
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Brankas Terproteksi PIN
            </span>
            <span className="text-neutral-600">·</span>
            <button
              onClick={() => setShowSqlModal(true)}
              className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 ${
                !isSupabaseConfigured()
                  ? 'text-amber-400 bg-amber-950/60 border-amber-800/80 hover:bg-amber-900/60'
                  : supabaseDiag && !supabaseDiag.tablesExist
                  ? 'text-rose-300 bg-rose-950/80 border-rose-700 animate-pulse'
                  : 'text-teal-400 bg-teal-950/60 border-teal-800/80 hover:bg-teal-900/60'
              }`}
              title="Klik untuk melihat Status & Skrip SQL Supabase"
            >
              <Zap className="w-3 h-3" />
              <span>
                {!isSupabaseConfigured()
                  ? 'Supabase: Menunggu Env URL'
                  : supabaseDiag && !supabaseDiag.tablesExist
                  ? '⚠️ Supabase: Tabel Belum Dibuat (Klik Setup)'
                  : 'Supabase Sync Aktif'}
              </span>
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manajemen Stok Akun Advance Server & BB Coin
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Kelola brankas akun Mobile Legends Advance Server siap kirim, margin harga, dan antrean konversi BB Coin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-teal-300 hover:text-teal-200 text-xs font-semibold rounded-xl border border-teal-800/60 flex items-center gap-1.5 transition-all shadow-sm"
            title="Buka Skrip SQL Setup Database Supabase"
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Setup SQL Supabase</span>
          </button>

          <button
            onClick={() => {
              setPinChangeError('');
              setPinChangeSuccess(false);
              setNewPinInput('');
              setConfirmPinInput('');
              setShowChangePinModal(true);
            }}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl border border-neutral-800 flex items-center gap-1.5 transition-all"
            title="Ubah PIN Keamanan Brankas"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Ganti PIN</span>
          </button>

          <button
            onClick={() => setShowAddAccountModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Stok</span>
          </button>

          <button
            onClick={async () => {
              showToast('Sedang memancarkan dan menyinkronkan stok ke Cloud...', 'warning');
              const res = await syncAllProductsToCloud(products);
              runSupabaseCheck();
              if (res.supabaseOk) {
                showToast('✅ Sukses! Stok telah di-upload ke Cloud Supabase & Firestore. Browser lain (Hola / Teman) sekarang langsung membaca stok ini!', 'success');
              } else if (res.supabaseError) {
                showToast(`⚠️ Supabase: ${res.supabaseError}`, 'warning');
                setShowSqlModal(true);
              } else if (res.firestoreOk) {
                showToast('✅ Tersinkron ke Firestore Cloud. Jangan lupa jalankan SQL di Supabase agar sinkron 100%.', 'success');
              } else {
                showToast('Stok lokal diperbarui.', 'success');
              }
            }}
            className="px-3.5 py-2 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 text-xs font-bold rounded-xl border border-emerald-800/60 flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-950/20"
            title="Kirim dan sinkronkan stok lokal saat ini ke Cloud Supabase & Firestore"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sinkronkan ke Cloud</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 text-xs font-semibold rounded-xl border border-red-800/50 flex items-center gap-1.5 transition-all active:scale-95"
              title="Keluar dari Panel Admin & Kunci Brankas"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Kunci Brankas</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating or Top Toast Alert for Actions */}
      {toastNotice && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          toastNotice.type === 'warning'
            ? 'bg-red-950/90 border-red-700 text-red-200'
            : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
        }`}>
          <div className="flex items-center gap-3">
            {toastNotice.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{toastNotice.message}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            className="p-1 hover:bg-black/30 rounded text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Total Omset (Revenue)</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono tabular-nums">
            {formatIDR(metrics.totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            +{metrics.successOrders} transaksi sukses
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Profit Bersih (Net Margin)</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {metrics.totalRevenue > 0
                ? `${Math.round((metrics.totalProfit / metrics.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {formatIDR(metrics.totalProfit)}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Laba bersih penjualan akun & BB Coin
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Stok Akun Advance Ready</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums">
            {metrics.accountsAvailable} Akun
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            {metrics.accountsSold} akun telah terjual & terkirim
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Kecepatan Pengiriman Web</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
            Instant (1-3 dtk)
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Data login muncul otomatis di layar
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-900 rounded-2xl border border-neutral-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Brankas Stok Akun Advance Server ({metrics.accountsAvailable} Ready)</span>
        </button>

        <button
          onClick={() => setActiveTab('bbcoin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'bbcoin'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Katalog BB Coin & Konversi Diamond</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Semua Pesanan ({orders.length})</span>
          {waitingVerificationCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black animate-pulse shadow-sm">
              {waitingVerificationCount} Perlu Verifikasi
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('promos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'promos'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Kode Promo ({promos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'media'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <span>Kelola Foto & Banner Toko</span>
        </button>

        <button
          onClick={() => setActiveTab('qris')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'qris'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>QRIS & DANA Admin (+62 823-1208-8548)</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'guide'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 text-white shadow-md shadow-blue-600/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Panduan & Alur Manajemen ASTERA STORE</span>
        </button>
      </div>

      {/* ================= TAB 1: BRANKAS STOK AKUN ADVANCE SERVER ================= */}
      {activeTab === 'accounts' && accountProduct && (
        <div className="space-y-6">
          {/* Status Kontrol Penjualan Produk Akun Advance */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            accountProduct.isActive === false
              ? 'bg-red-950/40 border-red-800/80'
              : 'bg-neutral-900/90 border-neutral-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  accountProduct.isActive === false
                    ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-white text-sm sm:text-base">
                      Status Penjualan Akun Advance Server
                    </h3>
                    {accountProduct.isActive === false ? (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span>PENJUALAN DIMATIKAN (STOK KOSONG)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>TOKO BUKA (TERSEDIA UNTUK PEMBELI)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {accountProduct.isActive === false
                      ? 'Produk ini sedang dinonaktifkan. Pembeli di website akan melihat status "Stok Kosong" dan tombol checkout dinonaktifkan.'
                      : 'Produk saat ini aktif dijual di website. Anda dapat mematikan seluruh produk atau memilih mematikan paket tertentu saja jika stok habis.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => handleToggleProductStatus(accountProduct.id)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    accountProduct.isActive === false
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  }`}
                  title={accountProduct.isActive === false ? 'Buka kembali penjualan akun' : 'Matikan produk agar pembeli tidak bisa order'}
                >
                  <Power className="w-4 h-4" />
                  <span>
                    {accountProduct.isActive === false
                      ? 'Aktifkan Produk Kembali'
                      : 'Matikan Produk (Stok Kosong)'}
                  </span>
                </button>

                <button
                  onClick={() => handleAutoDisableEmptyStock(accountProduct.id)}
                  className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Otomatis nonaktifkan semua paket yang akun readynya 0"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Auto-Matikan Paket 0 Stok</span>
                </button>

                <button
                  onClick={() => handleEnableAllPackages(accountProduct.id)}
                  className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Aktifkan seluruh paket akun sekaligus"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Aktifkan Semua</span>
                </button>

                <button
                  onClick={() => handleOpenEditProductDisplay(accountProduct)}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                  title="Ubah Judul, Subtitle, Badge Promo & Banner Gambar di Menu Utama"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Edit Display Produk</span>
                </button>
              </div>
            </div>
          </div>

          {/* Package Summary strip with Individual Status Toggles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Pengaturan Paket & Status Ketersediaan Tiap Tipe Akun
              </h4>
              <span className="text-[11px] text-neutral-500">
                Klik tombol "Matikan" pada paket yang habis agar pembeli tidak bisa memilihnya
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {accountProduct.denominations.map((denom) => {
                const isDenomActive = denom.isActive !== false;
                const unsold = getDenomReadyStock(denom);
                const soldFromOrders = orders.filter((o) => o.status === 'SUCCESS' && o.productType === 'advance_account' && o.itemId === denom.id).length;
                const sold = soldFromOrders || denom.accountPool?.filter((a) => a.isSold).length || 0;
                const isOutOfStock = unsold === 0;

                return (
                  <div
                    key={denom.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      !isDenomActive
                        ? 'bg-red-950/20 border-red-900/60 shadow-inner'
                        : isOutOfStock
                        ? 'bg-amber-950/20 border-amber-900/50'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-xs">{denom.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingItem({ productId: accountProduct.id, item: { ...denom } })}
                            className="p-1 rounded text-blue-400 hover:bg-neutral-800"
                            title="Edit Harga & Pengaturan Paket"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Status badge & fast 1-click toggle */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-neutral-800">
                        <div>
                          {!isDenomActive ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span>NONAKTIF (KOSONG)</span>
                            </span>
                          ) : isOutOfStock ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>READY: 0 AKUN</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>AKTIF (TERSEDIA)</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleDenomStatus(accountProduct.id, denom.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                            !isDenomActive
                              ? 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/50'
                              : 'bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40'
                          }`}
                          title={!isDenomActive ? 'Buka penjualan paket ini' : 'Matikan paket ini karena stok kosong'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{!isDenomActive ? 'Aktifkan' : 'Matikan (Kosong)'}</span>
                        </button>
                      </div>

                      <div className="flex items-baseline justify-between text-xs mt-1">
                        <span className="text-neutral-400">Harga Jual:</span>
                        <strong className="text-blue-400 font-mono">{formatIDR(denom.priceSell)}</strong>
                      </div>
                      <div className="flex items-baseline justify-between text-xs mt-1">
                        <span className="text-neutral-400">Modal:</span>
                        <span className="text-neutral-300 font-mono">{formatIDR(denom.priceBase)}</span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between text-xs mt-3 pt-2 border-t border-neutral-800">
                      <span className={unsold > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {unsold} Akun Ready
                      </span>
                      <span className="text-neutral-500">{sold} Terjual</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of Accounts in Pool */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm">Daftar Kredensial Akun Advance Server di Brankas</h3>
              <span className="text-xs text-neutral-400">Akun yang belum terjual akan otomatis terkirim saat customer membayar</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Paket Akun</th>
                    <th className="py-3 px-4">Email Moonton</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Server Target</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Status Stok</th>
                    <th className="py-3 px-4">Catatan Bind</th>
                    <th className="py-3 px-4 text-right">Aksi & Edit Kredensial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono">
                  {(() => {
                    const readyAccounts = accountProduct.denominations.flatMap((denom) =>
                      (denom.accountPool || [])
                        .filter((a) => !a.isSold)
                        .map((acc) => ({ ...acc, denomName: denom.name, denomId: denom.id }))
                    );

                    if (readyAccounts.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-neutral-400 font-sans">
                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                              <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-emerald-400 mb-1">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-bold text-white">Tidak Ada Akun Tersisa di Brankas</p>
                              <p className="text-xs text-neutral-500 leading-relaxed">
                                Akun yang telah berhasil dikirimkan ke pembeli otomatis terhapus dari brankas stok admin.
                              </p>
                              <button
                                onClick={() => setShowAddAccountModal(true)}
                                className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Stok Baru</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return readyAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-neutral-950/60 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-white whitespace-nowrap">
                          {acc.denomName}
                        </td>
                        <td className="py-3 px-4 text-blue-400 select-all">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{acc.email}</span>
                            <button
                              onClick={() => handleQuickCopyText(acc.email, `mail-${acc.id}`)}
                              className="p-1 hover:text-white text-neutral-500 rounded"
                              title="Salin Email"
                            >
                              {copiedAccId === `mail-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-amber-400 select-all">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{acc.password}</span>
                            <button
                              onClick={() => handleQuickCopyText(acc.password, `pass-${acc.id}`)}
                              className="p-1 hover:text-white text-neutral-500 rounded"
                              title="Salin Password"
                            >
                              {copiedAccId === `pass-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                          {acc.serverInfo}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                          Lv. {acc.level}
                        </td>
                        <td className="py-3 px-4 font-sans whitespace-nowrap">
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                            Ready Kirim
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-neutral-400 text-[11px] max-w-xs truncate">
                          {acc.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-sans whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditAccount(accountProduct.id, acc.denomId, acc)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                              title="Ganti Email / Password atau Perbaiki Salah Ketik"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Ganti / Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(accountProduct.id, acc.denomId, acc.id, acc.email)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/50 text-[11px] transition-all active:scale-95"
                              title="Hapus Akun dari Stok"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: BB COIN DENOMINASI ================= */}
      {activeTab === 'bbcoin' && bbCoinProduct && (
        <div className="space-y-6">
          {/* Status Kontrol Penjualan Produk BB Coin */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            bbCoinProduct.isActive === false
              ? 'bg-red-950/40 border-red-800/80'
              : 'bg-neutral-900/90 border-neutral-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  bbCoinProduct.isActive === false
                    ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-white text-sm sm:text-base">
                      Status Penjualan Top Up BB Coin Diamond
                    </h3>
                    {bbCoinProduct.isActive === false ? (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span>PENJUALAN DIMATIKAN (STOK KOSONG)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>TOKO BUKA (TERSEDIA UNTUK PEMBELI)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {bbCoinProduct.isActive === false
                      ? 'Penjualan top up BB Coin sedang dimatikan karena kuota injection habis atau antrian penuh. Pembeli tidak bisa memesan di website.'
                      : 'Penjualan top up BB Coin sedang aktif. Anda bisa mematikan seluruh produk atau mematikan nominal tertentu saja di tabel bawah.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => handleToggleProductStatus(bbCoinProduct.id)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                    bbCoinProduct.isActive === false
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  }`}
                  title={bbCoinProduct.isActive === false ? 'Buka kembali penjualan BB Coin' : 'Matikan produk BB Coin'}
                >
                  <Power className="w-4 h-4" />
                  <span>
                    {bbCoinProduct.isActive === false
                      ? 'Aktifkan Penjualan Kembali'
                      : 'Matikan Penjualan BB Coin'}
                  </span>
                </button>

                <button
                  onClick={() => handleEnableAllPackages(bbCoinProduct.id)}
                  className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Aktifkan seluruh nominal BB Coin sekaligus"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Aktifkan Semua Nominal</span>
                </button>

                <button
                  onClick={() => handleOpenEditProductDisplay(bbCoinProduct)}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                  title="Ubah Judul, Subtitle, Badge Promo & Banner Gambar di Menu Utama"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Edit Display Produk</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-white text-sm">Paket Top Up BB Coin & Konversi Diamond</h3>
                <p className="text-xs text-neutral-400">Atur ketersediaan stok, harga modal, harga jual, dan margin laba</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Paket BB Coin</th>
                    <th className="py-3 px-4">Diamond Dihasilkan</th>
                    <th className="py-3 px-4">Status Ketersediaan</th>
                    <th className="py-3 px-4">Harga Modal</th>
                    <th className="py-3 px-4">Harga Jual</th>
                    <th className="py-3 px-4">Margin Laba</th>
                    <th className="py-3 px-4 text-right">Aksi Kontrol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {bbCoinProduct.denominations.map((item) => {
                    const isItemActive = item.isActive !== false;
                    const profitRp = item.priceSell - item.priceBase;
                    const profitPercent = Math.round((profitRp / item.priceSell) * 100);
                    const totalD = (item.diamondAmount || 0) + (item.bonusDiamond || 0);

                    return (
                      <tr key={item.id} className={`hover:bg-neutral-950/40 transition-colors ${!isItemActive ? 'bg-red-950/10' : ''}`}>
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.bonusText && (
                              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/60">
                                {item.bonusText}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-400 font-mono">
                            {totalD} Diamonds
                          </span>
                          {item.bonusDiamond && (
                            <span className="text-[10px] text-blue-400 block font-sans">
                              ({item.diamondAmount} + {item.bonusDiamond} Bonus)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isItemActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Aktif (Tersedia)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span>Kosong (Mati)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-400">
                          {formatIDR(item.priceBase)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {formatIDR(item.priceSell)}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-emerald-400 font-bold block">+{formatIDR(profitRp)}</span>
                          <span className="text-[10px] text-neutral-500">{profitPercent}% margin</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleDenomStatus(bbCoinProduct.id, item.id)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                                isItemActive
                                  ? 'bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white border-red-800/60'
                                  : 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-800/60'
                              }`}
                              title={isItemActive ? 'Matikan stok paket ini' : 'Aktifkan kembali'}
                            >
                              <Power className="w-3 h-3" />
                              <span>{isItemActive ? 'Matikan' : 'Aktifkan'}</span>
                            </button>
                            <button
                              onClick={() => setEditingItem({ productId: bbCoinProduct.id, item: { ...item } })}
                              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-semibold rounded-lg border border-neutral-700"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SEMUA PESANAN & AUDIT ================= */}
      {activeTab === 'orders' && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari Order ID, WhatsApp, User ID..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-700 text-xs text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-white text-xs rounded-xl px-3 py-2"
              >
                <option value="all">Semua Status ({orders.length})</option>
                <option value="WAITING_VERIFICATION">
                  🟡 Menunggu Verifikasi Admin ({orders.filter(o => o.status === 'WAITING_VERIFICATION').length})
                </option>
                <option value="PENDING_PAYMENT">
                  ⚪ Menunggu Pembayaran ({orders.filter(o => o.status === 'PENDING_PAYMENT').length})
                </option>
                <option value="SUCCESS">
                  🟢 Lunas ({orders.filter(o => o.status === 'SUCCESS').length})
                </option>
                <option value="EXPIRED">
                  🔴 Kedaluwarsa ({orders.filter(o => o.status === 'EXPIRED').length})
                </option>
                <option value="CANCELLED">
                  ⛔ Dibatalkan ({orders.filter(o => o.status === 'CANCELLED').length})
                </option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-neutral-400">
                Total {filteredOrders.length} transaksi ditampilkan
              </span>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={handleAdminDeleteAllOrders}
                  className="px-2.5 py-1 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Hapus seluruh riwayat pesanan test dari database cloud & peranti"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Hapus Semua Pesanan ({orders.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Tipe Produk</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Penerima / Akun</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status Transaksi</th>
                  <th className="py-3 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredOrders.map((ord) => {
                  const statusDetails = getOrderStatusDetails(ord.status);
                  const canVerify = ord.status === 'WAITING_VERIFICATION' || ord.status === 'PENDING_PAYMENT';
                  return (
                    <tr key={ord.id} className="hover:bg-neutral-950/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{ord.id}</td>
                      <td className="py-3 px-4">
                        {ord.productType === 'advance_account' ? (
                          <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded font-bold">
                            AKUN ADVANCE
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded font-bold">
                            TOP UP BB COIN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{ord.itemName}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {ord.accountDelivered ? (
                          <span className="text-emerald-400 block font-bold">{ord.accountDelivered.email}</span>
                        ) : (
                          <span className="text-white block">{ord.userId} ({ord.zoneId})</span>
                        )}
                        <span className="text-neutral-500">WA: {ord.whatsapp}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                        {formatIDR(ord.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded inline-block ${statusDetails.badgeClass}`}>
                          {statusDetails.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {canVerify && (
                            <button
                              onClick={() => handleAdminVerifyOrder(ord.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-emerald-600/30"
                              title="Verifikasi dana masuk riil & kirim akun / Diamond"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verifikasi & Lunaskan</span>
                            </button>
                          )}
                          {onOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(ord)}
                              className="px-2.5 py-1 bg-blue-900/40 hover:bg-blue-800 text-blue-300 hover:text-white border border-blue-800/60 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                              title="Lihat Tampilan Invoice Pembeli Lengkap"
                            >
                              <Receipt className="w-3.5 h-3.5 text-blue-400" />
                              <span>Lihat Invoice</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] rounded transition-colors"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminDeleteOrder(ord.id)}
                            className="p-1.5 bg-red-950/70 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/80 rounded-lg transition-colors"
                            title="Hapus pesanan ini secara permanen dari database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: KODE PROMO ================= */}
      {activeTab === 'promos' && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <h3 className="font-bold text-white text-sm">Voucher Promo & Diskon STORE ADV</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promos.map((promo) => (
              <div key={promo.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-extrabold text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-900">
                    {promo.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">
                    AKTIF
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mb-3">{promo.description}</p>
                <div className="space-y-1 text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-2">
                  <div className="flex justify-between">
                    <span>Diskon:</span>
                    <strong className="text-white">{promo.discountPercent}% (Maks {formatIDR(promo.maxDiscount)})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pemakaian:</span>
                    <span className="text-blue-400 font-mono font-bold">{promo.usedCount} / {promo.quota}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: PANDUAN & ALUR LENGKAP MANAJEMEN BISNIS ASTERA STORE ================= */}
      {activeTab === 'guide' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 via-neutral-900 to-red-950/40 border border-blue-900/60 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-red-600 flex items-center justify-center font-black text-white shadow-md">
                AS
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Standar Operasional & Alur Manajemen ASTERA STORE
              </h2>
            </div>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Dokumentasi lengkap tata kelola inventaris, otomatisasi pembayaran, sistem pengiriman data akun instan di layar website, konversi BB Coin ke Diamond, dan strategi margin keuntungan bisnis ASTERA STORE.
            </p>
          </div>

          {/* Process 1: Manajemen Stok Akun Advance Server */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Manajemen Brankas & Stok Akun Advance Server
                </h3>
                <p className="text-xs text-neutral-400">
                  Pengelolaan kredensial akun Mobile Legends dengan sistem pool terenkripsi (Zero Double-Selling).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <Plus className="w-4 h-4" />
                  <span>1. Restok Kredensial Baru</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Admin menginput data akun baru (Email Moonton, Password, Server 5701/5702, Level, dan catatan panduan). Setiap akun yang diinput masuk ke pool status <code className="text-emerald-400">isSold: false</code> dan stok bertambah otomatis.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2. Alokasi Otomatis (FIFO)</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Ketika pelanggan checkout dan membayar lunas, sistem secara otomatis mengambil 1 akun terlama di antrean (First-In, First-Out), mengunci akun tersebut, dan mengubah statusnya menjadi <code className="text-amber-400">isSold: true</code> terikat pada ID Pesanan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <Key className="w-4 h-4" />
                  <span>3. Tampil Langsung di Layar Web</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Data Email, Password, Server, dan Panduan langsung dibuka di layar website pembeli secara instan dalam 1-3 detik. Pelanggan dapat menyalin 1-klik atau mengunduh file kredensial <code className="text-blue-400">.TXT</code> ke perangkat mereka.
                </p>
              </div>
            </div>
          </section>

          {/* Process 2: Manajemen BB Coin & Konversi Diamond */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Top Up BB Coin & Konversi Diamond Advance Server
                </h3>
                <p className="text-xs text-neutral-400">
                  Mekanisme konversi resmi Bang Bang Coin menjadi Diamond in-game langsung ke User ID & Server.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <UserCheck className="w-4 h-4" />
                  <span>1. Validasi Akun Gamers</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Pembeli memasukkan User ID dan Zone ID secara langsung. Sistem ASTERA STORE memproses pesanan sesuai data ID yang dimasukkan pembeli tanpa hambatan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <Coins className="w-4 h-4" />
                  <span>2. Rumus Rasio Konversi</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Rasio resmi: <strong>5 BB Coin = 1 Diamond</strong>. Contoh: 1.000 BB = 200 DM (Rp 10.000), 5.000 BB = 1.000 DM (Rp 25.000), hingga 50.000 BB = 10.000 DM (Rp 250.000). Harga sesuai tabel resmi ASTERA STORE.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <Zap className="w-4 h-4" />
                  <span>3. Auto-Injeksi 1-3 Detik</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Setelah verifikasi mutasi pembayaran diterima, API provider otomatis menginjeksi saldo BB Coin yang langsung berubah menjadi Diamond in-game tanpa perlu login akun oleh admin.
                </p>
              </div>
            </div>
          </section>

          {/* Process 3: Gateway Pembayaran & Verifikasi Otomatis */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Alur Integrasi Pembayaran Otomatis (QRIS & E-Wallet GoPay, DANA)
                </h3>
                <p className="text-xs text-neutral-400">
                  Pembayaran otomatis jam 09:00 - 22:00 WIB tanpa perlu kirim struk bukti transfer manual ke WhatsApp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">A. Generate Invoice</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Nomor invoice unik dihasilkan (contoh: AST-261020-XXXX) bersama kode bayar QRIS dinamis atau transfer E-Wallet (GoPay & DANA).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">B. Countdown 15 Menit</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Timer aktif menjaga ketersediaan kuota stok. Jika waktu habis sebelum dibayar, pesanan otomatis kedaluwarsa dan stok dikembalikan ke brankas.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">C. Callback / Webhook</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Ketika dana masuk ke rekening merchant, gateway mengirim webhook notifikasi instan. Status invoice berubah dari <code className="text-amber-400">PENDING</code> menjadi <code className="text-emerald-400">SUCCESS</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-white block mb-1 text-xs">D. Settlement Dana</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Dana hasil penjualan langsung masuk ke saldo kas ASTERA STORE dan siap dicairkan (disbursement) harian ke rekening pemilik toko.
                </p>
              </div>
            </div>
          </section>

          {/* Process 4: Strategi Finansial & Margin Keuntungan */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Manajemen Finansial, HPP (Modal) & Margin Keuntungan
                </h3>
                <p className="text-xs text-neutral-400">
                  Kalkulasi laba bersih, penetapan harga jual, dan ekspor laporan pembukuan toko.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Produk / Paket</th>
                    <th className="py-2.5 px-3">Modal Dasar (HPP)</th>
                    <th className="py-2.5 px-3">Harga Jual ASTERA STORE</th>
                    <th className="py-2.5 px-3">Margin Laba Bersih</th>
                    <th className="py-2.5 px-3">Persentase Margin</th>
                    <th className="py-2.5 px-3">Status Pemenuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Fresh (Lvl 8)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(35000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(49000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(14000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">28.5%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Ranked (Lvl 12+)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(55000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(79000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(24000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">30.3%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">Akun Advance Sultan (Lvl 20+)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(95000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(139000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(44000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">31.6%</td>
                    <td className="py-2.5 px-3 font-sans text-emerald-400">Tampil Langsung di Web</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">1000 BB (200 DM)</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(8000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(10000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(2000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">5.000 BB (1.000 DM) [Promo]</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(20000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(25000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(5000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                  <tr className="hover:bg-neutral-950/50">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">50.000 BB (10.000 DM) [Jumbo]</td>
                    <td className="py-2.5 px-3 text-neutral-400">{formatIDR(200000)}</td>
                    <td className="py-2.5 px-3 text-blue-400 font-bold">{formatIDR(250000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{formatIDR(50000)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">20.0%</td>
                    <td className="py-2.5 px-3 font-sans text-blue-400">Injeksi Instan via API</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-400">
              <p>
                * Rumus Laba: <strong>Profit = Harga Jual - Modal Dasar (HPP) - Biaya Transaksi Payment Gateway</strong>.
              </p>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-blue-400 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Finansial (.CSV)</span>
              </button>
            </div>
          </section>

          {/* Process 5: Layanan Purna Jual & Pelacakan Transaksi */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Layanan Purna Jual & Pelacakan Transaksi Pelanggan
                </h3>
                <p className="text-xs text-neutral-400">
                  Solusi jika pelanggan tidak sengaja menutup halaman atau butuh data akun kembali.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <h4 className="font-bold text-white text-sm mb-1">Fitur Lacak Pesanan 24 Jam</h4>
                <p className="text-neutral-400 leading-relaxed">
                  Pelanggan cukup memasukkan <strong>Nomor Invoice</strong> atau <strong>Nomor WhatsApp</strong> mereka pada modal Lacak Pesanan di navbar. Seluruh data kredensial akun dan status pengiriman BB Coin akan langsung muncul kembali dengan aman.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <h4 className="font-bold text-white text-sm mb-1">Audit Log & Resend Manual Admin</h4>
                <p className="text-neutral-400 leading-relaxed">
                  Di tab "Semua Pesanan", Admin dapat mengklik tombol mata pada tiap transaksi untuk melihat timeline transaksi, data kredensial yang telah dikirim, atau mengirim ulang struk resmi langsung ke nomor WhatsApp pembeli.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB: KELOLA FOTO & BANNER TOKO ================= */}
      {activeTab === 'media' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-neutral-900 to-indigo-950/40 border border-purple-900/60 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Kelola Foto, Banner Promo & Sampul Toko
                </h2>
                <p className="text-xs text-neutral-400">
                  Ganti semua foto yang tampil di website ASTERA STORE secara instan (Upload File dari HP/PC atau URL Gambar).
                </p>
              </div>
            </div>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-3xl leading-relaxed mt-2">
              Semua perubahan foto akan tersimpan ke sistem database lokal dan otomatis memperbarui tampilan bagi setiap pembeli secara real-time. Anda bisa mengunggah foto dari HP / komputer atau menempelkan link gambar.
            </p>
          </div>

          <form onSubmit={handleSaveStoreAssets} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Banner Promo Hero Beranda */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      1. Banner Promo Utama (Hero Banner)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeroInput(DEFAULT_STORE_ASSETS.heroBannerImg)}
                    className="text-[11px] text-neutral-400 hover:text-purple-300 underline"
                  >
                    Reset Default
                  </button>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Banner visual besar di bagian atas halaman beranda. Menampilkan promo Advance Server & diskon.
                </p>

                {/* Live Preview */}
                <div className="relative aspect-[16/7] rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950">
                  {heroInput ? (
                    <img
                      src={heroInput}
                      alt="Preview Hero Banner"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_STORE_ASSETS.heroBannerImg;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                      Belum ada banner
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-neutral-300 font-mono">
                    Pratinjau Live Banner
                  </span>
                </div>

                {/* Upload File */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Unggah dari Komputer / HP:
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-purple-500 bg-neutral-950/70 text-neutral-400 hover:text-purple-300 cursor-pointer transition-all text-xs font-medium">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Gambar Banner (PNG / JPG / WEBP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, setHeroInput, 'Banner Promo Utama')}
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Atau Masukkan Tautan / Link URL Gambar:
                  </label>
                  <input
                    type="text"
                    value={heroInput}
                    onChange={(e) => setHeroInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                {/* Tombol Simpan Perubahan Banner */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-neutral-800/70">
                  <span className="text-[11px] text-neutral-400">
                    💡 Klik simpan untuk langsung menerapkan gambar banner promo utama
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleSaveStoreAssets(e)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Perubahan Banner</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Cover Sampul Akun Advance Server */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      2. Sampul Produk: Akun Advance Server
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountCoverInput(DEFAULT_STORE_ASSETS.accountProductImg)}
                    className="text-[11px] text-neutral-400 hover:text-blue-300 underline"
                  >
                    Reset Default
                  </button>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Foto cover thumbnail produk akun Advance Server di beranda dan halaman pemilihan paket akun.
                </p>

                {/* Live Preview */}
                <div className="relative aspect-[16/9] max-h-48 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950">
                  {accountCoverInput ? (
                    <img
                      src={accountCoverInput}
                      alt="Preview Sampul Akun Advance"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_STORE_ASSETS.accountProductImg;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                      Belum ada foto sampul
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-neutral-300 font-mono">
                    Pratinjau Sampul Akun
                  </span>
                </div>

                {/* Upload File */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Unggah dari Komputer / HP:
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-blue-500 bg-neutral-950/70 text-neutral-400 hover:text-blue-300 cursor-pointer transition-all text-xs font-medium">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Gambar Sampul Akun (PNG / JPG / WEBP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, setAccountCoverInput, 'Sampul Akun Advance Server')}
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Atau Masukkan Tautan / Link URL Gambar:
                  </label>
                  <input
                    type="text"
                    value={accountCoverInput}
                    onChange={(e) => setAccountCoverInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Card 3: Cover Sampul BB Coin & Diamond */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      3. Sampul Produk: BB Coin & Diamond
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBbcoinCoverInput(DEFAULT_STORE_ASSETS.bbcoinProductImg)}
                    className="text-[11px] text-neutral-400 hover:text-amber-300 underline"
                  >
                    Reset Default
                  </button>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Foto cover thumbnail produk konversi BB Coin dan Top Up Diamond di beranda dan formulir order.
                </p>

                {/* Live Preview */}
                <div className="relative aspect-[16/9] max-h-48 rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950">
                  {bbcoinCoverInput ? (
                    <img
                      src={bbcoinCoverInput}
                      alt="Preview Sampul BB Coin"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_STORE_ASSETS.bbcoinProductImg;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                      Belum ada foto sampul
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-neutral-300 font-mono">
                    Pratinjau Sampul BB Coin
                  </span>
                </div>

                {/* Upload File */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Unggah dari Komputer / HP:
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-amber-500 bg-neutral-950/70 text-neutral-400 hover:text-amber-300 cursor-pointer transition-all text-xs font-medium">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Gambar BB Coin (PNG / JPG / WEBP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, setBbcoinCoverInput, 'Sampul BB Coin & Diamond')}
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Atau Masukkan Tautan / Link URL Gambar:
                  </label>
                  <input
                    type="text"
                    value={bbcoinCoverInput}
                    onChange={(e) => setBbcoinCoverInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Card 4: Logo / Avatar Toko */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      4. Logo & Avatar Toko ASTERA STORE
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoreLogoInput('')}
                    className="text-[11px] text-neutral-400 hover:text-emerald-300 underline"
                  >
                    Hapus / Gunakan Ikon Default
                  </button>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Logo toko yang tampil di navigasi atas dan footer. Jika kosong, sistem menggunakan lambang monogram resmi ASTERA STORE.
                </p>

                {/* Live Preview */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-neutral-700 bg-neutral-950">
                  <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                    {storeLogoInput ? (
                      <img
                        src={storeLogoInput}
                        alt="Logo Toko"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xl">
                        A
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">ASTERA STORE</h4>
                    <p className="text-[11px] text-neutral-400">
                      {storeLogoInput ? 'Menggunakan Logo Gambar Kustom' : 'Menggunakan Monogram Lambang Bawaan'}
                    </p>
                    <span className="inline-block mt-1 text-[10px] text-emerald-400 font-medium">
                      Aktif di Header & Footer Toko
                    </span>
                  </div>
                </div>

                {/* Upload File */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Unggah Logo dari Komputer / HP:
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-emerald-500 bg-neutral-950/70 text-neutral-400 hover:text-emerald-300 cursor-pointer transition-all text-xs font-medium">
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Logo (PNG Transparan / WEBP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, setStoreLogoInput, 'Logo Toko')}
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Atau Masukkan Tautan / Link URL Logo:
                  </label>
                  <input
                    type="text"
                    value={storeLogoInput}
                    onChange={(e) => setStoreLogoInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

            </div>

            {/* Save Buttons Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-neutral-400">
                💡 <strong className="text-white">Tips Admin:</strong> Klik tombol simpan di bawah untuk mengaplikasikan semua foto & banner secara permanen ke website.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHeroInput(DEFAULT_STORE_ASSETS.heroBannerImg);
                    setAccountCoverInput(DEFAULT_STORE_ASSETS.accountProductImg);
                    setBbcoinCoverInput(DEFAULT_STORE_ASSETS.bbcoinProductImg);
                    setStoreLogoInput('');
                    showToast('Semua input dikembalikan ke foto bawaan. Klik Simpan untuk konfirmasi.', 'warning');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  Reset Semua
                </button>
                <button
                  type="submit"
                  onClick={(e) => handleSaveStoreAssets(e)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan Banner & Semua Foto Toko</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB: PENGATURAN QRIS & DANA ADMIN ================= */}
      {activeTab === 'qris' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-blue-950/40 border border-emerald-900/60 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white shadow-md">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Pengaturan QRIS & Rekening DANA Admin
                </h2>
                <p className="text-xs text-neutral-400">
                  Nomor DANA & WhatsApp Admin: <strong className="text-emerald-400">+62 823-1208-8548</strong>
                </p>
              </div>
            </div>
            <p className="text-neutral-300 text-xs sm:text-sm max-w-3xl leading-relaxed mt-2">
              Kelola Barcode QRIS DANA Bisnis dan nomor transfer e-wallet toko Anda. Setiap pembeli yang melakukan pembayaran via scan QRIS atau transfer DANA, dananya akan langsung masuk real-time ke akun DANA Anda.
            </p>
          </div>

          {/* Guide Section: Cara Biar QRIS Langsung Masuk ke DANA Admin */}
          <section className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                💡
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Panduan: Cara Agar QRIS Langsung Masuk ke Saldo DANA Admin (Nomor 0823-1208-8548)
                </h3>
                <p className="text-xs text-neutral-400">
                  Gunakan fitur resmi <strong>DANA Bisnis</strong> di aplikasi DANA untuk mendapatkan QRIS Bank Indonesia gratis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs">1</span>
                  <span>Daftar DANA Bisnis di HP</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Buka aplikasi <strong>DANA</strong> dengan nomor <strong className="text-white">0823-1208-8548</strong>. Buka menu <strong>Saya (Profil)</strong> di pojok kanan bawah, lalu pilih menu <strong>DANA Bisnis</strong>. Klik <strong>Daftar Sekarang</strong> (100% Gratis).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs">2</span>
                  <span>Ambil Barcode QRIS Toko</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Isi nama bisnis <strong>ASTERA STORE</strong> dan kategori <strong>Voucher Game</strong>. Setelah aktif, buka menu <strong>Kode QR Toko Saya</strong>, lalu klik <strong>Unduh Gambar QRIS</strong> atau screenshot kode QR tersebut di HP Anda.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs">3</span>
                  <span>Upload di Panel Ini</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Upload file foto QRIS tersebut pada form di bawah ini. Kode QRIS website akan otomatis terhubung ke akun DANA Anda, dan setiap scan pembayaran dari bank/e-wallet manapun langsung masuk ke saldo DANA Anda!
                </p>
              </div>
            </div>
          </section>

          {/* Form & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              <section className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Form Konfigurasi QRIS & DANA Admin</span>
                </h3>

                <form onSubmit={handleSavePaymentConfig} className="space-y-4 text-xs">
                  {/* Nomor DANA Admin */}
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      Nomor Akun DANA Admin (Penerima Transfer):
                    </label>
                    <input
                      type="text"
                      value={danaNumberInput}
                      onChange={(e) => setDanaNumberInput(e.target.value)}
                      placeholder="Contoh: 0823-1208-8548"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Nomor ini yang ditampilkan ke pembeli saat memilih metode bayar DANA.
                    </span>
                  </div>

                  {/* Nama Akun DANA */}
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      Nama Akun / Toko DANA (a/n):
                    </label>
                    <input
                      type="text"
                      value={danaNameInput}
                      onChange={(e) => setDanaNameInput(e.target.value)}
                      placeholder="Contoh: ASTERA STORE / NAMA ADMIN"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* WhatsApp Admin */}
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      Nomor WhatsApp Customer Service Admin:
                    </label>
                    <input
                      type="text"
                      value={adminPhoneInput}
                      onChange={(e) => setAdminPhoneInput(e.target.value)}
                      placeholder="Contoh: +62 823-1208-8548"
                      className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Tombol chat WhatsApp di seluruh website akan langsung mengarah ke nomor ini.
                    </span>
                  </div>

                  {/* Upload QRIS Image */}
                  <div className="pt-2 border-t border-neutral-800">
                    <label className="block text-neutral-300 font-semibold mb-1">
                      Upload Gambar / Foto Barcode QRIS DANA Bisnis:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <label className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl cursor-pointer font-bold text-xs flex items-center gap-2 transition-colors">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Pilih Foto QRIS DANA...</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrisFileChange}
                          className="hidden"
                        />
                      </label>
                      {qrisImageInput && (
                        <button
                          type="button"
                          onClick={() => setQrisImageInput('')}
                          className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                          Hapus Gambar (Gunakan Barcode Default)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Atau Input URL QRIS */}
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Atau URL Gambar QRIS (Opsional):
                    </label>
                    <input
                      type="text"
                      value={qrisImageInput.startsWith('data:') ? '' : qrisImageInput}
                      onChange={(e) => setQrisImageInput(e.target.value)}
                      placeholder="https://.../qris-dana-anda.png"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* NMID / Label QRIS */}
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      NMID / Label Merchant QRIS:
                    </label>
                    <input
                      type="text"
                      value={qrisNmidInput}
                      onChange={(e) => setQrisNmidInput(e.target.value)}
                      placeholder="Contoh: ID99281726481 (DANA BISNIS ASTERA STORE)"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Pengaturan Pembayaran & QRIS DANA</span>
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <section className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span>Live Preview di Layar Pembeli</span>
                  </h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                    ONLINE AKTIF
                  </span>
                </div>

                {/* Preview Box */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 text-xs">
                  {/* QRIS Card Preview */}
                  <div className="p-3 bg-white rounded-2xl shadow-lg border border-neutral-300 max-w-[210px] mx-auto text-center">
                    <div className="border-b border-neutral-300 pb-1 mb-1.5">
                      <span className="text-[10px] font-black tracking-wider text-neutral-900 block">
                        QRIS DANA BISNIS RESMI
                      </span>
                      <span className="text-[8px] font-bold text-blue-600 block">
                        {danaNameInput || 'ASTERA STORE'}
                      </span>
                    </div>

                    {qrisImageInput ? (
                      <div className="w-full mx-auto bg-white flex items-center justify-center p-1 rounded border border-neutral-200">
                        <img
                          src={qrisImageInput}
                          alt="Preview QRIS DANA"
                          className="w-full max-h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-36 h-36 mx-auto bg-neutral-950 p-1.5 rounded grid grid-cols-7 gap-1">
                        <div className="bg-white rounded-xs p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-3 h-3 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-xs col-span-3" />
                        <div className="bg-white rounded-xs p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-3 h-3 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-xs col-span-3" />
                        <div className="bg-blue-600 col-span-1 flex items-center justify-center font-bold text-[8px] text-white">
                          DANA
                        </div>
                        <div className="bg-white rounded-xs col-span-2" />
                        <div className="bg-white rounded-xs p-1 flex items-center justify-center col-span-2 row-span-2">
                          <div className="w-3 h-3 bg-neutral-950 rounded-xs" />
                        </div>
                        <div className="bg-white rounded-xs col-span-5" />
                      </div>
                    )}

                    <div className="pt-1.5 mt-1 border-t border-neutral-200 text-[8px] text-neutral-600 font-mono">
                      {qrisNmidInput || 'ID99281726481 (DANA BISNIS ASTERA STORE)'}
                    </div>
                  </div>

                  {/* Transfer DANA Preview */}
                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[11px] text-neutral-400 block mb-0.5">Transfer Langsung DANA:</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-sm">
                        {danaNumberInput || '0823-1208-8548'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        a/n {danaNameInput || 'ASTERA STORE'}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Admin Test Link */}
                  <div className="pt-1">
                    <a
                      href={`https://wa.me/${adminPhoneInput.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Tes Link CS WhatsApp (+62 823-1208-8548)</span>
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH STOK AKUN ADVANCE ================= */}
      {showAddAccountModal && accountProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-white">Tambah Stok Akun Advance Server</h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Pilih Paket Akun:</label>
                <select
                  value={selectedDenomForAccount}
                  onChange={(e) => setSelectedDenomForAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                >
                  {accountProduct.denominations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Email / Akun Moonton:</label>
                <input
                  type="text"
                  required
                  placeholder="adv.player@advserver-store.com"
                  value={newAccEmail}
                  onChange={(e) => setNewAccEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Password Akun:</label>
                <input
                  type="text"
                  required
                  placeholder="Password#2026"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-400 mb-1">Server Target:</label>
                  <input
                    type="text"
                    value={newAccServer}
                    onChange={(e) => setNewAccServer(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Level Akun:</label>
                  <input
                    type="number"
                    value={newAccLevel}
                    onChange={(e) => setNewAccLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Panduan / Catatan Khusus untuk Pembeli:</label>
                <input
                  type="text"
                  value={newAccNotes}
                  onChange={(e) => setNewAccNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold"
                >
                  Simpan Akun ke Brankas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PRICE ================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Edit Harga & Status Paket</h3>
                <p className="text-[11px] text-neutral-400">Atur ketersediaan paket untuk pembeli di toko</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Nama Paket:</label>
                <input
                  type="text"
                  value={editingItem.item.name}
                  onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, name: e.target.value } })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                />
              </div>

              {/* Status Ketersediaan (Aktif / Matikan Saat Kosong) */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1.5">
                  Status Ketersediaan di Website:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, item: { ...editingItem.item, isActive: true } })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      editingItem.item.isActive !== false
                        ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-md'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>🟢 Aktif (Bisa Dipesan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, item: { ...editingItem.item, isActive: false } })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      editingItem.item.isActive === false
                        ? 'bg-red-600/25 border-red-500 text-red-300 ring-2 ring-red-500/40 shadow-md'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Power className="w-4 h-4 text-red-400" />
                    <span>🔴 Matikan (Stok Kosong)</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {editingItem.item.isActive === false
                    ? '⚠️ Paket ini ditutup. Pembeli tidak akan bisa memilih atau memesan paket ini di website.'
                    : '✓ Paket ini aktif dan siap dibeli oleh customer.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Modal Dasar (IDR):</label>
                  <input
                    type="number"
                    value={editingItem.item.priceBase}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, priceBase: Number(e.target.value) } })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Harga Jual (IDR):</label>
                  <input
                    type="number"
                    value={editingItem.item.priceSell}
                    onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, priceSell: Number(e.target.value) } })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono font-bold text-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Badge / Keterangan Bonus (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Paling Laris / Bonus 50 DM"
                  value={editingItem.item.bonusText || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, item: { ...editingItem.item, bonusText: e.target.value } })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GANTI PIN KEAMANAN ================= */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowChangePinModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ganti PIN Brankas</h3>
                <p className="text-xs text-neutral-400">Atur PIN rahasia baru Anda</p>
              </div>
            </div>

            {pinChangeSuccess ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center text-xs text-emerald-300 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="font-bold text-sm text-white">PIN Berhasil Diganti!</p>
                <p>Gunakan PIN baru ini saat membuka portal admin selanjutnya.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveNewPin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    PIN Baru (minimal 4 digit)
                  </label>
                  <input
                    type="password"
                    maxLength={12}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Masukkan PIN baru"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Konfirmasi Ulang PIN Baru
                  </label>
                  <input
                    type="password"
                    maxLength={12}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Ketik ulang PIN baru"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none"
                  />
                </div>

                {pinChangeError && (
                  <p className="text-xs text-red-400 font-medium">⚠️ {pinChangeError}</p>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePinModal(false)}
                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20"
                  >
                    Simpan PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ORDER DETAILS & CREDENTIALS AUDIT ================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Detail Pesanan & Kredensial Terkirim</h3>
                <p className="text-xs font-mono text-blue-400">{selectedOrderDetails.id}</p>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-400 text-[11px] block">Status Saat Ini:</span>
                  <span className={`text-[11px] font-bold border px-2 py-0.5 rounded inline-block mt-0.5 ${getOrderStatusDetails(selectedOrderDetails.status).badgeClass}`}>
                    {getOrderStatusDetails(selectedOrderDetails.status).label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 text-[11px] block">Total Transaksi:</span>
                  <span className="text-blue-400 font-mono font-bold text-sm">{formatIDR(selectedOrderDetails.totalAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-400 text-[11px] block">WhatsApp Pembeli:</span>
                  <span className="text-white font-mono">+62 {selectedOrderDetails.whatsapp}</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[11px] block">Metode Pembayaran:</span>
                  <span className="text-white font-medium">{selectedOrderDetails.paymentMethodName}</span>
                </div>
              </div>

              {selectedOrderDetails.verifiedBy && (
                <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-900/60 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Telah diverifikasi sah oleh <strong>{selectedOrderDetails.verifiedBy}</strong>
                    {selectedOrderDetails.verifiedAt && ` pada ${new Date(selectedOrderDetails.verifiedAt).toLocaleString('id-ID')}`}
                  </span>
                </div>
              )}

              {/* Action Box if Order is NOT yet SUCCESS */}
              {(selectedOrderDetails.status === 'WAITING_VERIFICATION' || selectedOrderDetails.status === 'PENDING_PAYMENT') && (
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Tindakan Verifikasi Mutasi Admin:</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Pastikan Anda telah memeriksa mutasi riil di aplikasi DANA (+62 823-1208-8548). Klik tombol di bawah untuk melunaskan dan menyerahkan akun / Diamond ke pembeli:
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAdminVerifyOrder(selectedOrderDetails.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi Dana Masuk & Set Lunas</span>
                  </button>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAdminMarkExpired(selectedOrderDetails.id)}
                      className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded-lg"
                    >
                      Tandai Kedaluwarsa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminCancelOrder(selectedOrderDetails.id)}
                      className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] rounded-lg"
                    >
                      Batalkan Pesanan
                    </button>
                  </div>
                </div>
              )}

              {selectedOrderDetails.accountDelivered && (
                <div className="p-3.5 bg-blue-950/40 rounded-xl border border-blue-900/60 space-y-2">
                  <span className="text-blue-300 font-bold block">Data Akun Advance Server yang Dikirim:</span>
                  <div className="font-mono text-white">
                    <div>Email: <strong className="text-blue-400">{selectedOrderDetails.accountDelivered.email}</strong></div>
                    <div>Password: <strong className="text-amber-400">{selectedOrderDetails.accountDelivered.password}</strong></div>
                    <div>Server: {selectedOrderDetails.accountDelivered.serverInfo}</div>
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-neutral-300 block mb-2">Timeline Audit Transaksi:</span>
                <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 max-h-36 overflow-y-auto font-mono text-[11px]">
                  {selectedOrderDetails.logs.map((log, i) => (
                    <div key={i} className="text-neutral-300">
                      <span className="text-blue-400">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>

              {onOpenInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrderDetails;
                    setSelectedOrderDetails(null);
                    onOpenInvoice(ord);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all active:scale-95"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Buka Invoice Pembeli (Tampilan Lengkap)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAdminDeleteOrder(selectedOrderDetails.id)}
                className="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Hapus Pesanan Ini Secara Permanen</span>
              </button>

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT / GANTI KREDENSIAL AKUN (SALAH KETIK / UPDATE) ================= */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit & Ganti Kredensial Akun</h3>
                  <p className="text-xs text-neutral-400">
                    Koreksi jika ada salah ketik email, password, atau ubah detail akun
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountEdit} className="space-y-4 text-xs">
              {/* Paket Akun (Option to Move) */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Kategori Paket Akun:
                </label>
                {accountProduct && (
                  <select
                    value={editingAccount.targetDenomId}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        targetDenomId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {accountProduct.denominations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({formatIDR(d.priceSell)})
                      </option>
                    ))}
                  </select>
                )}
                {editingAccount.currentDenomId !== editingAccount.targetDenomId && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    * Akun akan dipindahkan ke kategori paket yang baru dipilih saat disimpan.
                  </p>
                )}
              </div>

              {/* Email Moonton */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-300 font-semibold">
                    Email Moonton (Kredensial Login):
                  </label>
                  <span className="text-[10px] text-blue-400 font-mono">Bisa diubah jika ada typo</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editingAccount.account.email}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          email: e.target.value,
                        },
                      })
                    }
                    placeholder="contoh: adv.user@moonton-mail.com"
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Moonton */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-300 font-semibold">
                    Password Akun Moonton:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditAccPassword(!showEditAccPassword)}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    {showEditAccPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showEditAccPassword ? 'Sembunyikan' : 'Lihat Password'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditAccPassword ? 'text' : 'password'}
                    required
                    value={editingAccount.account.password}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          password: e.target.value,
                        },
                      })
                    }
                    placeholder="Masukkan password baru..."
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Server & Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Server Target:
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAccount.account.serverInfo}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          serverInfo: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Level Akun:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    required
                    value={editingAccount.account.level}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          level: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Ketersediaan (Ready vs Terjual) */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Status Ketersediaan Akun:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          isSold: false,
                        },
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !editingAccount.account.isSold
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready Kirim (Stok Ada)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingAccount({
                        ...editingAccount,
                        account: {
                          ...editingAccount.account,
                          isSold: true,
                        },
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      editingAccount.account.isSold
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span>Sudah Terjual (Habis)</span>
                  </button>
                </div>
              </div>

              {/* Catatan Bind & Instruksi */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Catatan Akun / Instruksi Login:
                </label>
                <textarea
                  rows={2}
                  value={editingAccount.account.notes}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      account: {
                        ...editingAccount.account,
                        notes: e.target.value,
                      },
                    })
                  }
                  placeholder="Catatan khusus yang akan tampil kepada pembeli..."
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteAccount(
                      editingAccount.productId,
                      editingAccount.currentDenomId,
                      editingAccount.account.id,
                      editingAccount.account.email
                    )
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/50 font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Akun</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT DISPLAY & TAMPILAN PRODUK ================= */}
      {editingProductDisplay && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kustomisasi Display Produk: {editingProductDisplay.title}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Atur nama, subjudul, badge promo, banner gambar, dan deskripsi di menu utama toko
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductDisplay(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductDisplay} className="space-y-4 text-xs">
              {/* LIVE PREVIEW OF GAMECARD */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Preview Live Tampilan Kartu di Menu Utama Toko:</span>
                </span>
                <div className="max-w-md mx-auto rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-lg">
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
                    <img
                      src={editingProductDisplay.coverImage || MLBB_COVER_IMG}
                      alt={editingProductDisplay.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = MLBB_COVER_IMG;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                    {editingProductDisplay.badge && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                        {editingProductDisplay.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-[11px] text-blue-400 font-bold block mb-1">
                      {editingProductDisplay.publisher || 'Moonton Games'}
                    </span>
                    <h4 className="text-base font-extrabold text-white leading-tight mb-1">
                      {editingProductDisplay.title || 'Judul Produk'}
                    </h4>
                    <p className="text-xs text-neutral-400 line-clamp-1 mb-3">
                      {editingProductDisplay.subtitle || 'Subjudul produk...'}
                    </p>
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                      <span className="text-neutral-400 text-[11px]">Mulai dari:</span>
                      <strong className="text-blue-400 font-mono font-bold">
                        {formatIDR(editingProductDisplay.denominations[0]?.priceSell || 10000)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* INPUT FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Judul Produk (Tampil di Menu Utama):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProductDisplay.title}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        title: e.target.value,
                      })
                    }
                    placeholder="Contoh: Top Up Advance Server (BB Coin Auto Konversi 5:1)"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Subtitle */}
                <div className="sm:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Subjudul / Slogan Produk:
                  </label>
                  <input
                    type="text"
                    value={editingProductDisplay.subtitle}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        subtitle: e.target.value,
                      })
                    }
                    placeholder="Contoh: Konversi BB Coin Moonton Rasio 5:1 Menjadi Diamond..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Badge Tag */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Badge Tag Promo (Pojok Gambar):
                  </label>
                  <input
                    type="text"
                    value={editingProductDisplay.badge}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        badge: e.target.value,
                      })
                    }
                    placeholder="Contoh: Auto Konversi 5:1 / Kirim Instan / DISKON 50%"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Publisher */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Publisher / Kategori Brand:
                  </label>
                  <input
                    type="text"
                    value={editingProductDisplay.publisher}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        publisher: e.target.value,
                      })
                    }
                    placeholder="Contoh: Moonton Bang Bang Coin / Moonton Games"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Cover Image URL & Presets */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-300 font-semibold">
                      URL Gambar Cover / Banner:
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      Bisa pakai link gambar eksternal atau pilih preset
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingProductDisplay.coverImage}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        coverImage: e.target.value,
                      })
                    }
                    placeholder="https://... atau pilih tombol preset di bawah"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2"
                  />

                  {/* Preset Image Chooser */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-neutral-400 font-semibold">Pilih Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProductDisplay({
                          ...editingProductDisplay,
                          coverImage: MLBB_COVER_IMG,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] flex items-center gap-1 border border-neutral-700"
                    >
                      <ImageIcon className="w-3 h-3 text-blue-400" />
                      <span>MLBB Cover Utama</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProductDisplay({
                          ...editingProductDisplay,
                          coverImage: HERO_PROMO_IMG,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] flex items-center gap-1 border border-neutral-700"
                    >
                      <ImageIcon className="w-3 h-3 text-red-400" />
                      <span>Hero Gaming Promo</span>
                    </button>
                  </div>
                </div>

                {/* Short Description */}
                <div className="sm:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Deskripsi Singkat (Tampil di Halaman Pesanan):
                  </label>
                  <textarea
                    rows={2}
                    value={editingProductDisplay.shortDesc}
                    onChange={(e) =>
                      setEditingProductDisplay({
                        ...editingProductDisplay,
                        shortDesc: e.target.value,
                      })
                    }
                    placeholder="Penjelasan produk untuk pembeli..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleResetProductDisplay(editingProductDisplay.id)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Reset Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProductDisplay(null)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Display Produk</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SETUP DATABASE SUPABASE (SQL RUNNER) ================= */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-8 animate-in fade-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowSqlModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Setup Database Supabase
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-normal">
                    Multi-Device Sync
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Sinkronkan stok akun antara Chrome, Hola Browser, Tab Samaran, dan semua HP pengunjung.
                </p>
              </div>
            </div>

            {/* Status Live Diagnostic */}
            <div className="mb-5 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Kredensial Database:</span>
                <div className="flex items-center gap-2">
                  <span className={isSupabaseConfigured() ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {isSupabaseConfigured() ? (getSupabaseConfig().isCustom ? '✓ Terhubung (Kredensial Manual)' : '✓ Terhubung (Env Vercel)') : '⚠️ Belum Dikonfigurasi'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomConfigForm(!showCustomConfigForm)}
                    className="text-[10px] text-teal-400 underline hover:text-teal-300"
                  >
                    {showCustomConfigForm ? 'Tutup' : 'Edit URL / Key'}
                  </button>
                </div>
              </div>

              {showCustomConfigForm && (
                <form onSubmit={handleSaveCustomSupabase} className="p-3 my-2 rounded-xl bg-neutral-900 border border-teal-800/60 space-y-2.5">
                  <p className="text-[11px] text-teal-300 font-semibold">
                    Atur URL & Anon Key Supabase secara langsung (Berguna untuk GitHub Pages atau jika Env Vercel belum aktif):
                  </p>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Project URL:</label>
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={customSbUrl}
                      onChange={(e) => setCustomSbUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Anon / Public Key:</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={customSbKey}
                      onChange={(e) => setCustomSbKey(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSupabaseConfig('', '');
                        setCustomSbUrl('');
                        setCustomSbKey('');
                        refreshSupabaseClient();
                        showToast('Kredensial manual dihapus, kembali ke default env.', 'warning');
                        runSupabaseCheck();
                      }}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[11px] rounded-lg"
                    >
                      Reset Env
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] rounded-lg shadow-sm"
                    >
                      Simpan & Hubungkan
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Tabel 'products' Supabase:</span>
                <span
                  className={
                    supabaseDiag?.tablesExist
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold flex items-center gap-1'
                  }
                >
                  {isCheckingSupabase ? (
                    'Mengecek...'
                  ) : supabaseDiag?.tablesExist ? (
                    '✓ Tabel Aktif & Siap'
                  ) : (
                    '⚠️ Belum Dibuat di Supabase'
                  )}
                </span>
              </div>
              {supabaseDiag?.errorMessage && !supabaseDiag.tablesExist && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/60 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Penyebab Stok Beda / Kosong di Browser Lain:</strong> Database Supabase Anda belum memiliki tabel <code>products</code>. Jalankan skrip SQL di bawah ini 1x di dashboard Supabase agar stok 2 akun langsung tampil di semua browser!
                </div>
              )}
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Cara Menjalankan Skrip (Hanya 1 Menit):
              </h4>
              <ol className="text-xs text-neutral-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>
                  Klik tombol <strong>"Salin Skrip SQL"</strong> di bawah ini.
                </li>
                <li>
                  Buka dashboard Supabase Anda di{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline inline-flex items-center gap-0.5 hover:text-blue-300"
                  >
                    supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Buka menu <strong>SQL Editor</strong> di sidebar sebelah kiri &gt; Klik <strong>New query</strong>.
                </li>
                <li>
                  <strong>Paste (Ctrl+V)</strong> skrip SQL tersebut, lalu klik tombol hijau <strong>Run</strong>.
                </li>
                <li>
                  Selesai! Klik <strong>"Sinkronkan ke Cloud"</strong> di panel Admin ini. Stok akan otomatis sama persis di semua browser.
                </li>
              </ol>
            </div>

            {/* SQL Snippet View */}
            <div className="relative mb-5">
              <div className="max-h-52 overflow-y-auto p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 whitespace-pre leading-relaxed select-all">
                {SUPABASE_SETUP_SQL}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                  showToast('Skrip SQL berhasil disalin ke clipboard!', 'success');
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin Skrip SQL'}</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={runSupabaseCheck}
                disabled={isCheckingSupabase}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{isCheckingSupabase ? 'Mengecek...' : 'Tes Ulang Status'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    showToast('Sedang memancarkan stok ke Cloud...', 'warning');
                    const res = await syncAllProductsToCloud(products);
                    runSupabaseCheck();
                    if (res.supabaseOk) {
                      showToast('✅ Sukses! 2 Stok Akun telah tersinkron ke Supabase Cloud!', 'success');
                      setShowSqlModal(false);
                    } else if (res.supabaseError) {
                      showToast(`⚠️ Masih belum dibuat: ${res.supabaseError}`, 'warning');
                    } else {
                      showToast('Tersimpan di Cloud.', 'success');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sinkronkan Stok Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
