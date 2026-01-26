
import React, { useState, useRef, useEffect } from 'react';
import { db } from '../../db';
import { Account, AccountGroup, VatRate } from '../../officeTypes';
import { Toast, ToastType, ConfirmModal } from '../../components/SharedUI';

// --- Types & Helper ---
interface TreeNode {
    type: 'group' | 'account';
    id: number;
    number: string;
    name: string;
    data: Account | AccountGroup;
    level: number;
    parentGroupId?: number;
}

const flattenTree = (
    groups: AccountGroup[], 
    accounts: Account[], 
    parentId: number | undefined = undefined, 
    level: number = 0
): TreeNode[] => {
    let result: TreeNode[] = [];
    
    // 1. Find groups belonging to this parent
    const currentGroups = groups
        .filter(g => g.parentGroupId === parentId)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    // 2. Find accounts belonging to this parent
    const currentAccounts = accounts
        .filter(a => a.groupId === parentId)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    for (const grp of currentGroups) {
        result.push({ type: 'group', id: grp.id!, number: grp.number, name: grp.name, data: grp, level, parentGroupId: grp.parentGroupId });
        // Recursion
        result = result.concat(flattenTree(groups, accounts, grp.id, level + 1));
    }

    for (const acc of currentAccounts) {
        result.push({ type: 'account', id: acc.id!, number: acc.number, name: acc.name, data: acc, level, parentGroupId: acc.groupId });
    }

    return result;
};

// --- Main Component ---
interface ChartOfAccountsProps {
    accounts: Account[];
    groups: AccountGroup[];
    onRefresh: () => void;
    onSelectAccount?: (id: number) => void; // Optional callback if used as selector
}

const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ accounts, groups, onRefresh, onSelectAccount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  
  // Action Menu State
  const [actionMenu, setActionMenu] = useState<{ id: number, type: 'group'|'account', x: number, y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Editor State
  const [editGroup, setEditGroup] = useState<AccountGroup | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<any>(null);

  // UI Feedback
  const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);
  const [confirmData, setConfirmData] = useState<any>(null);

  useEffect(() => {
      db.settings.toArray().then(s => setSettings(s[0]));
  }, []);

  useEffect(() => {
      let nodes = flattenTree(groups, accounts);
      
      // Orphan Handling (Items without parent or invalid parent)
      const groupIds = new Set(groups.map(g => g.id));
      const orphans = accounts.filter(a => !a.groupId || !groupIds.has(a.groupId));
      if (orphans.length > 0) {
          const orphanNodes = orphans.map(a => ({
              type: 'account' as const, id: a.id!, number: a.number, name: a.name, data: a, level: 0, parentGroupId: undefined
          }));
          nodes = [...nodes, ...orphanNodes];
      }

      if (searchTerm) {
          nodes = nodes.filter(n => 
              n.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
              n.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
      }
      setTreeNodes(nodes);
  }, [accounts, groups, searchTerm]);

  // Click Outside to close menu
  useEffect(() => {
      const handleClick = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
              setActionMenu(null);
          }
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  // --- Actions ---

  const handleActionClick = (e: React.MouseEvent, node: TreeNode) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setActionMenu({
          id: node.id,
          type: node.type,
          x: rect.left - 100, // Align slightly left
          y: rect.bottom + 5
      });
  };

  const handleEdit = () => {
      if (!actionMenu) return;
      const { id, type } = actionMenu;
      if (type === 'group') {
          const g = groups.find(x => x.id === id);
          if (g) setEditGroup(g);
      } else {
          const a = accounts.find(x => x.id === id);
          if (a) setEditAccount(a);
      }
      setActionMenu(null);
  };

  const handleCopy = async () => {
      if (!actionMenu) return;
      const { id, type } = actionMenu;
      if (type === 'group') {
          const g = groups.find(x => x.id === id);
          if (g) {
              const copy = { ...g, id: undefined, number: g.number + '-KOPIE', name: g.name + ' (Kopie)' };
              await db.accountGroups.add(copy);
          }
      } else {
          const a = accounts.find(x => x.id === id);
          if (a) {
              const copy = { ...a, id: undefined, number: a.number + '-CPY', name: a.name + ' (Kopie)' };
              await db.accounts.add(copy);
          }
      }
      setActionMenu(null);
      onRefresh();
      setToast({ msg: 'Erfolgreich kopiert', type: 'success' });
  };

  const handleToggleActive = async () => {
      if (!actionMenu) return;
      const { id, type } = actionMenu;
      if (type === 'group') {
          const g = groups.find(x => x.id === id);
          if (g) await db.accountGroups.update(id, { isActive: !g.isActive });
      } else {
          const a = accounts.find(x => x.id === id);
          if (a) await db.accounts.update(id, { isActive: !a.isActive });
      }
      setActionMenu(null);
      onRefresh();
  };

  const checkUsage = async (id: number, type: 'group' | 'account'): Promise<boolean> => {
      if (type === 'account') {
          // Check bookings (invoices / expenses)
          const inExpenses = await db.expenses.where('accountId').equals(id).count();
          // Complex invoice check (simplified for now, ideally check bookings table if implemented)
          // For demo: prevent delete if standard account
          if (id < 10000) return true; // Pretend usage for standard
          if (inExpenses > 0) return true;
      } else {
          // Group: check if has children
          const hasChildGroups = groups.some(g => g.parentGroupId === id);
          const hasChildAccounts = accounts.some(a => a.groupId === id);
          if (hasChildGroups || hasChildAccounts) return true;
      }
      return false;
  };

  const handleDelete = async () => {
      if (!actionMenu) return;
      const { id, type } = actionMenu;
      setActionMenu(null);

      const isUsed = await checkUsage(id, type);
      if (isUsed) {
          setConfirmData({
              title: 'Löschen nicht möglich',
              message: 'Dieses Element wird bereits verwendet oder enthält Unterelemente. Bitte erst bereinigen oder deaktivieren.',
              confirmLabel: 'OK',
              onConfirm: () => setConfirmData(null),
              onCancel: () => setConfirmData(null),
              isDestructive: false
          });
          return;
      }

      setConfirmData({
          title: `${type === 'group' ? 'Gruppe' : 'Konto'} löschen?`,
          message: 'Diese Aktion kann nicht rückgängig gemacht werden.',
          isDestructive: true,
          onConfirm: async () => {
              if (type === 'group') await db.accountGroups.delete(id);
              else await db.accounts.delete(id);
              setConfirmData(null);
              onRefresh();
              setToast({ msg: 'Gelöscht', type: 'info' });
          },
          onCancel: () => setConfirmData(null)
      });
  };

  // --- Save Functions ---

  const saveGroup = async (g: AccountGroup) => {
      if (g.id) await db.accountGroups.update(g.id, g);
      else await db.accountGroups.add({ ...g, isActive: true });
      setEditGroup(null);
      onRefresh();
      setToast({ msg: 'Gruppe gespeichert', type: 'success' });
  };

  const saveAccount = async (a: Account) => {
      if (a.id) await db.accounts.update(a.id, a);
      else await db.accounts.add({ ...a, isActive: true });
      setEditAccount(null);
      onRefresh();
      setToast({ msg: 'Konto gespeichert', type: 'success' });
  };

  // --- Helpers for Selects ---
  const vatRates: VatRate[] = settings?.vatRates || [];

  return (
    <div className="h-full flex flex-col relative">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        {confirmData && <ConfirmModal {...confirmData} />}

        {/* --- Toolbar --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
                <input 
                    className="w-full border border-zinc-200 p-3 pl-10 rounded-xl text-sm font-bold shadow-sm outline-none focus:border-olive-500" 
                    placeholder="Suchen nach Nummer oder Name..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-3.5 text-zinc-400">🔍</span>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setEditGroup({ number: '', name: '', isActive: true })} className="flex-1 md:flex-none bg-white border border-zinc-200 px-4 py-3 rounded-xl font-bold text-xs uppercase hover:bg-zinc-50 shadow-sm">+ Gruppe</button>
                <button onClick={() => setEditAccount({ number: '', name: '', type: 'asset', isActive: true, isVatBookable: false })} className="flex-1 md:flex-none bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-black shadow-lg">+ Konto</button>
            </div>
        </div>

        {/* --- Tree Table --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 text-left font-bold text-zinc-500 w-48">Nummer</th>
                            <th className="p-4 text-left font-bold text-zinc-500">Bezeichnung</th>
                            <th className="p-4 text-left font-bold text-zinc-500 w-32">Typ</th>
                            <th className="p-4 text-center font-bold text-zinc-500 w-24">MWST</th>
                            <th className="p-4 text-right w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {treeNodes.map(node => (
                            <tr 
                                key={`${node.type}-${node.id}`} 
                                className={`
                                    transition-colors 
                                    ${node.type === 'group' ? 'bg-zinc-50/40 font-bold' : 'hover:bg-olive-50/20'}
                                    ${node.data.isActive === false ? 'opacity-50 grayscale' : ''}
                                `}
                            >
                                <td className="p-4 font-mono text-zinc-700" style={{ paddingLeft: `${node.level * 24 + 16}px` }}>
                                    {node.type === 'group' && <span className="mr-2 text-zinc-400">📂</span>}
                                    {node.number}
                                </td>
                                <td className="p-4 text-zinc-800">
                                    {node.name}
                                </td>
                                <td className="p-4">
                                    {node.type === 'account' && (
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-zinc-100 text-zinc-500`}>
                                            {(node.data as Account).type}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    {(node.data as Account).isVatBookable ? <span className="text-green-500 font-bold">✓</span> : ''}
                                </td>
                                <td className="p-4 text-right relative">
                                    <button 
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-black font-bold"
                                        onClick={(e) => handleActionClick(e, node)}
                                    >
                                        ⋮
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- Action Menu (Absolute) --- */}
        {actionMenu && (
            <div 
                ref={menuRef}
                className="fixed bg-white rounded-xl shadow-xl border border-zinc-100 py-2 w-48 z-[60] flex flex-col animate-in fade-in zoom-in-95 duration-100"
                style={{ top: actionMenu.y, left: Math.min(actionMenu.x, window.innerWidth - 200) }}
            >
                <button onClick={handleEdit} className="px-4 py-2.5 text-left text-xs font-bold hover:bg-zinc-50 flex items-center gap-2"><span>✏️</span> Bearbeiten</button>
                <button onClick={handleCopy} className="px-4 py-2.5 text-left text-xs font-bold hover:bg-zinc-50 flex items-center gap-2"><span>📋</span> Kopieren</button>
                <button onClick={handleToggleActive} className="px-4 py-2.5 text-left text-xs font-bold hover:bg-zinc-50 flex items-center gap-2"><span>👁️</span> De-/Aktivieren</button>
                <div className="h-px bg-zinc-100 my-1"></div>
                <button onClick={handleDelete} className="px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><span>🗑️</span> Löschen</button>
            </div>
        )}

        {/* --- Group Editor Modal --- */}
        {editGroup && (
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-zinc-100 bg-white">
                        <h3 className="font-black uppercase text-lg">Gruppe bearbeiten</h3>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Gruppennummer</label>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 font-bold font-mono outline-none" value={editGroup.number} onChange={e => setEditGroup({...editGroup, number: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Gruppenname</label>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none" value={editGroup.name} onChange={e => setEditGroup({...editGroup, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Übergeordnete Gruppe</label>
                            <select 
                                className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none"
                                value={editGroup.parentGroupId || ''}
                                onChange={e => setEditGroup({...editGroup, parentGroupId: parseInt(e.target.value) || undefined})}
                            >
                                <option value="">(Keine - Hauptgruppe)</option>
                                {groups.filter(g => g.id !== editGroup.id).map(g => (
                                    <option key={g.id} value={g.id}>{g.number} {g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
                        <button onClick={() => setEditGroup(null)} className="flex-1 py-3 rounded-xl font-bold uppercase text-xs text-zinc-500 hover:bg-zinc-200 transition-colors">Abbrechen</button>
                        <button onClick={() => saveGroup(editGroup)} className="flex-1 py-3 rounded-xl font-bold uppercase text-xs bg-zinc-900 text-white hover:bg-black transition-colors shadow-lg">Speichern</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- Account Editor Modal --- */}
        {editAccount && (
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-zinc-100 bg-white">
                        <h3 className="font-black uppercase text-lg">Konto bearbeiten</h3>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-zinc-400">Kontonummer</label>
                                <input className="w-full border p-3 rounded-xl bg-zinc-50 font-bold font-mono outline-none" value={editAccount.number} onChange={e => setEditAccount({...editAccount, number: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-zinc-400">Kontoart</label>
                                <select className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none" value={editAccount.type} onChange={e => setEditAccount({...editAccount, type: e.target.value as any})}>
                                    <option value="asset">Aktiv</option>
                                    <option value="liability">Passiv</option>
                                    <option value="revenue">Ertrag</option>
                                    <option value="expense">Aufwand</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Kontoname</label>
                            <input className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none" value={editAccount.name} onChange={e => setEditAccount({...editAccount, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Zugewiesene Gruppe</label>
                            <select 
                                className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none"
                                value={editAccount.groupId || ''}
                                onChange={e => setEditAccount({...editAccount, groupId: parseInt(e.target.value) || undefined})}
                            >
                                <option value="">(Keine - Orphan)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.number} {g.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="pt-4 border-t border-zinc-100">
                            <label className="flex items-center gap-3 cursor-pointer mb-4">
                                <input type="checkbox" className="w-5 h-5 accent-olive-600 rounded" checked={editAccount.isVatBookable} onChange={e => setEditAccount({...editAccount, isVatBookable: e.target.checked})} />
                                <span className="font-bold text-sm text-zinc-700">MWST kann gebucht werden</span>
                            </label>
                            
                            {editAccount.isVatBookable && (
                                <div className="space-y-1 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-bold uppercase text-zinc-400">Standard MWST-Satz</label>
                                    <select 
                                        className="w-full border p-3 rounded-xl bg-zinc-50 font-bold outline-none"
                                        value={editAccount.defaultVatRate || ''}
                                        onChange={e => setEditAccount({...editAccount, defaultVatRate: parseFloat(e.target.value)})}
                                    >
                                        <option value="">(Kein Standard)</option>
                                        {vatRates.map(v => (
                                            <option key={v.code} value={v.rate}>{v.description} ({v.rate}%)</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
                        <button onClick={() => setEditAccount(null)} className="flex-1 py-3 rounded-xl font-bold uppercase text-xs text-zinc-500 hover:bg-zinc-200 transition-colors">Abbrechen</button>
                        <button onClick={() => saveAccount(editAccount)} className="flex-1 py-3 rounded-xl font-bold uppercase text-xs bg-zinc-900 text-white hover:bg-black transition-colors shadow-lg">Speichern</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ChartOfAccounts;
