import React from 'react';
import { Search, Bell, Loader2, LogIn, LogOut } from 'lucide-react';
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
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/70 px-5 md:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div className="animate-in fade-in slide-in-from-left-4 duration-500">
        <h2 className="text-xl md:text-2xl font-black text-text-main tracking-tight leading-none">{title}</h2>
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
              "text-[10px] font-bold uppercase tracking-[0.16em]",
              isConnected === false ? "text-creative" : "text-text-light"
            )}>
              {isConnected === null ? 'Syncing...' : isConnected ? 'Firebase connected' : 'Firebase disconnected'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative group hidden xl:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-brand-accent transition-all duration-300" size={15} />
          <input 
            type="text" 
            placeholder="Search jobs, clients, quotes..." 
            className="pl-11 pr-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-brand-accent/10 focus:bg-white focus:border-brand-accent/35 transition-all duration-300 w-80"
          />
        </div>

        <div className="flex items-center gap-3 md:gap-5 md:pl-6 md:border-l border-slate-200">
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

          <div className="flex items-center gap-3 cursor-pointer p-1.5 md:pr-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 transition-all duration-300 group shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-xs shadow-md shadow-brand/5 transition-all group-hover:scale-105 uppercase">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-text-main leading-none tracking-tight">
                {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
              </span>
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-[0.12em] mt-1 opacity-95">
                {user ? 'Staff access' : 'Guest access'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
