import React from "react";
import { BookOpen, User, Shield, LogOut, Terminal, BookMarked, Search, AlertTriangle, Coins, Menu, X, ShoppingCart } from "lucide-react";

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
  cartCount: number;
  onOpenCart: () => void;
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
  cartCount,
  onOpenCart,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle view change and close menu
  const handleSetView = (view: string) => {
    setView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm font-sans">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => handleSetView("home")}
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

        {/* Search Bar - only visible when browsing catalog on desktop */}
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

        {/* Desktop Nav Links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
          <button
            onClick={() => handleSetView("home")}
            className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "home"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            id="nav-home"
          >
            Accueil
          </button>

          <button
            onClick={() => handleSetView("catalog")}
            className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "catalog"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            id="nav-catalog"
          >
            Catalogue
          </button>

          {/* Desktop Shopping Cart Button */}
          <button
            onClick={onOpenCart}
            className="p-2 relative text-slate-600 hover:text-indigo-650 hover:bg-slate-50 rounded-lg transition-all cursor-pointer flex items-center justify-center mr-1"
            title="Panier"
            id="btn-cart-desktop"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-mono font-bold text-white leading-none shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <>
              <button
                onClick={() => handleSetView("my-purchases")}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "my-purchases"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="nav-purchases"
              >
                <BookMarked className="h-4 w-4" />
                <span>Mes Achats</span>
              </button>

              <button
                onClick={() => handleSetView("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "dashboard" || currentView === "cv-editor" || currentView === "bio-editor" || currentView === "install-connector"
                    ? "bg-indigo-650 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="nav-cv-dashboard"
              >
                <User className="h-4 w-4 text-indigo-500 group-hover:text-white" />
                <span>Mon Espace CV</span>
              </button>

              <button
                onClick={() => handleSetView("affiliate")}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "affiliate"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="nav-affiliate"
              >
                <Coins className="h-4 w-4 text-indigo-500" />
                <span>
                  {userAffiliate && userAffiliate.status === "approved" && userAffiliate.activated
                    ? "Espace Affilié"
                    : "Devenir Affilié"}
                </span>
              </button>

              {role === "admin" && (
                <button
                  onClick={() => handleSetView("admin")}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === "admin"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  id="nav-admin"
                >
                  <Shield className="h-4 w-4" />
                  <span>Back-Office</span>
                </button>
              )}

              <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

              {/* User Menu & LogOut */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800">{user.email}</span>
                  <span className="text-[10px] text-indigo-650 uppercase font-bold font-mono tracking-wider">
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
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs lg:text-sm font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
              id="btn-login-open"
            >
              <User className="h-4 w-4" />
              <span>Connexion</span>
            </button>
          )}
        </nav>

        {/* Mobile Hamburger Button (hidden on desktop) */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Shopping Cart Button */}
          <button
            onClick={onOpenCart}
            className="p-2 relative text-slate-600 hover:text-indigo-650 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center"
            title="Panier"
            id="btn-cart-mobile"
          >
            <ShoppingCart className="h-5.5 w-5.5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-mono font-bold text-white leading-none shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 z-30 bg-slate-900/20 backdrop-blur-xs transition-opacity duration-300 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Drawer */}
          <div
            className="absolute top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-xl p-5 space-y-4 md:hidden animate-in fade-in slide-in-from-top-4 duration-200"
            id="mobile-drawer"
          >
            {/* Search Input for mobile if currentView === "catalog" */}
            {currentView === "catalog" && (
              <div className="relative w-full">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un livre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                  id="search-input-mobile"
                />
              </div>
            )}

            {/* Navigation links listed vertically */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleSetView("home")}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                  currentView === "home"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Accueil
              </button>

              <button
                onClick={() => handleSetView("catalog")}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                  currentView === "catalog"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Catalogue
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => handleSetView("my-purchases")}
                    className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                      currentView === "my-purchases"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <BookMarked className="h-4 w-4 text-indigo-500" />
                    <span>Mes Achats</span>
                  </button>

                  <button
                    onClick={() => handleSetView("dashboard")}
                    className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                      currentView === "dashboard" || currentView === "cv-editor" || currentView === "bio-editor" || currentView === "install-connector"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <User className="h-4 w-4 text-indigo-500" />
                    <span>Mon Espace CV</span>
                  </button>

                  <button
                    onClick={() => handleSetView("affiliate")}
                    className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                      currentView === "affiliate"
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Coins className="h-4 w-4 text-indigo-500" />
                    <span>
                      {userAffiliate && userAffiliate.status === "approved" && userAffiliate.activated
                        ? "Espace Affilié"
                        : "Devenir Affilié"}
                    </span>
                  </button>

                  {role === "admin" && (
                    <button
                      onClick={() => handleSetView("admin")}
                      className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2.5 ${
                        currentView === "admin"
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Shield className="h-4 w-4 text-indigo-500" />
                      <span>Back-Office</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-slate-100 my-2"></div>

                  {/* Profile section in mobile menu */}
                  <div className="px-4 py-3 bg-slate-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[240px]">{user.email}</span>
                      <span className="text-[10px] text-indigo-650 font-bold uppercase font-mono tracking-wider">{role}</span>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <User className="h-4 w-4" />
                  <span>Connexion / Inscription</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
