import React from 'react';
import { Search, Plus, Bell, Wifi, WifiOff, Loader2, LogIn, LogOut } from 'lucide-react';
import { useFirestoreConnection } from '@/src/lib/firestoreService';
import { useAuth } from '@/src/lib/authContext';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isConnected } = useFirestoreConnection();
  const { user, login, logout } = useAuth();
  
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : user?.email?.charAt(0).toUpperCase() || 'AU';
  
  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
        <h2 className="text-xl font-bold text-text-main tracking-tight uppercase leading-none">{title}</h2>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-2">
            {isConnected === null ? (
              <Loader2 className="w-1.5 h-1.5 animate-spin text-brand-accent" />
            ) : isConnected ? (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-creative animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            )}
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-[0.2em]",
              isConnected === false ? "text-creative" : "text-text-light"
            )}>
              {isConnected === null ? 'Syncing...' : isConnected ? 'Operational' : 'Disconnected'}
            </p>
          </div>
          <div className="w-1 h-1 bg-slate-200 rounded-full" />
          <p className="text-[9px] font-bold text-text-light/50 uppercase tracking-[0.2em]">Session-L6</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden xl:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all duration-300" size={15} />
          <input 
            type="text" 
            placeholder="Command Search..." 
            className="pl-11 pr-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-accent/5 focus:bg-white focus:border-brand-accent/35 transition-all duration-300 w-80 placeholder:text-text-light/50"
          />
        </div>

        <div className="flex items-center gap-6 pl-6 border-l border-slate-100">
          <button className="relative p-2.5 text-text-light hover:text-brand-accent hover:bg-slate-50 rounded-xl transition-all group">
            <Bell size={18} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-creative rounded-full ring-2 ring-white shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
          </button>

          <button
            type="button"
            onClick={() => user ? logout() : login?.()}
            className="p-2.5 text-text-light hover:text-brand-accent hover:bg-slate-50 rounded-xl transition-all"
            title={user ? 'Sign out' : 'Sign in with Google'}
          >
            {user ? <LogOut size={18} /> : <LogIn size={18} />}
          </button>

          <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 transition-all duration-300 group shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-xs shadow-md shadow-brand/5 transition-all group-hover:scale-105 uppercase">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-text-main leading-none uppercase tracking-tight">
                {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
              </span>
              <span className="text-[8px] font-bold text-brand-accent uppercase tracking-[0.15em] mt-1 opacity-95">
                {user ? 'Studio Access' : 'External'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
