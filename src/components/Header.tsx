import React from "react";
import { BookOpen, User, Shield, LogOut, Terminal, BookMarked, Search, AlertTriangle, Coins } from "lucide-react";

interface HeaderProps {
  currentView: string;
  setView: (view: string) => void;
  user: any;
  role: string;
  userAffiliate?: any;
  onLogout: () => void;
  onOpenAuth: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
}

export default function Header({
  currentView,
  setView,
  user,
  role,
  userAffiliate,
  onLogout,
  onOpenAuth,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categories,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm font-sans">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => setView("home")}
          className="flex items-center gap-2 cursor-pointer group"
          id="nav-logo"
        >
          <div className="p-2 bg-slate-900 text-white rounded-xl group-hover:bg-indigo-600 transition-colors duration-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display font-black text-lg tracking-tight text-slate-900 leading-none">
              Ebook<span className="text-indigo-600">Store</span>
            </h1>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono tracking-widest uppercase">AFRIQUE MONÉTISÉ</p>
          </div>
        </div>

        {/* Search Bar - only visible when browsing catalog */}
        {currentView === "catalog" && (
          <div className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un livre par titre, auteur ou catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
              id="search-input"
            />
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setView("home")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "home"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            id="nav-home"
          >
            Accueil
          </button>

          <button
            onClick={() => setView("catalog")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "catalog"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            id="nav-catalog"
          >
            Catalogue
          </button>

          {user ? (
            <>
              <button
                onClick={() => setView("my-purchases")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "my-purchases"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="nav-purchases"
              >
                <BookMarked className="h-4 w-4" />
                <span className="hidden sm:inline">Mes Achats</span>
              </button>

              <button
                onClick={() => setView("affiliate")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "affiliate"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="nav-affiliate"
              >
                <Coins className="h-4 w-4 text-indigo-500" />
                <span className="hidden sm:inline">
                  {userAffiliate && userAffiliate.status === "approved" && userAffiliate.activated
                    ? "Espace Affilié"
                    : "Devenir Affilié"}
                </span>
                <span className="sm:hidden">Affilié</span>
              </button>

              {role === "admin" && (
                <button
                  onClick={() => setView("admin")}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === "admin"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  id="nav-admin"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Back-Office</span>
                </button>
              )}

              <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

              {/* User Menu & LogOut */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800">{user.email}</span>
                  <span className="text-[10px] text-indigo-600 uppercase font-bold font-mono tracking-wider">
                    {role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Se déconnecter"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  id="btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
              id="btn-login-open"
            >
              <User className="h-4 w-4" />
              <span>Connexion</span>
            </button>
          )}
        </nav>
      </div>

      {/* Subcategory Bar - catalog view only */}
      {currentView === "catalog" && categories.length > 1 && (
        <div className="bg-slate-50/50 border-t border-slate-200 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 shrink-0 font-mono">Filtres:</span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1 text-xs font-semibold rounded-full shrink-0 cursor-pointer transition-all ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-transparent"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full shrink-0 cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border-transparent"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
