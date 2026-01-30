
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/Input';
import { H1, P } from '../../components/ui/Typography';

interface LoginScreenProps {
    onBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onBack }) => {
    const { login, loginWithProvider, isDevMode } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        const success = await login(email, password);
        if (!success) {
            setError('Ungültige Anmeldedaten.');
            setIsLoading(false);
        }
    };

    const handleSocial = async (provider: 'google' | 'apple') => {
        setIsLoading(true);
        await loginWithProvider(provider);
    };

    // Schnellzugriff für Entwicklung
    const handleDevLogin = async () => {
        setEmail('admin@borer.ch');
        setPassword('dev123');
        await login('admin@borer.ch', 'dev123');
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="absolute top-6 left-6 z-20 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-colors text-zinc-500 hover:text-black md:text-white/80 md:hover:text-white"
            >
                ← Zurück zur Website
            </button>

            {/* Left: Brand / Image */}
            <div className="hidden md:flex md:w-1/2 bg-zinc-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1633613286991-611fe299c4be?q=80&w=2070')] bg-cover bg-center"></div>
                
                <div className="relative z-10 pt-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-olive-600 rounded flex items-center justify-center font-black text-xl">B</div>
                        <span className="font-black text-2xl uppercase tracking-widest">Maler Borer</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-black uppercase leading-tight mb-6">Das digitale Büro für moderne Handwerker.</h2>
                    <p className="text-zinc-400 font-medium leading-relaxed">
                        Verwalten Sie Offerten, Rechnungen und Projekte von überall. 
                        Sicher, schnell und vollständig digitalisiert.
                    </p>
                </div>

                <div className="relative z-10 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    © {new Date().getFullYear()} Borer Digital Solutions
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative bg-white">
                
                {/* DEV BYPASS BUTTON */}
                {isDevMode && (
                    <button 
                        onClick={handleDevLogin}
                        className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-widest hover:bg-yellow-200 transition-colors animate-pulse z-30"
                    >
                        ⚡ Dev: Schnellzugriff
                    </button>
                )}

                <div className="w-full max-w-md space-y-8 pt-12 md:pt-0">
                    <div className="text-center md:text-left">
                        <H1 className="mb-2">Willkommen zurück</H1>
                        <P className="text-zinc-500">Bitte melden Sie sich an, um auf Ihr Büro zuzugreifen.</P>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleSocial('google')} className="flex items-center justify-center gap-2 p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors bg-white text-sm font-bold text-zinc-700">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                        </button>
                        <button onClick={() => handleSocial('apple')} className="flex items-center justify-center gap-2 p-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors bg-white text-sm font-bold text-zinc-700">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.93.95 0 3.42.3 4.75 2.25-4.15 2.08-3.46 8.5 1.48 10.91zM13 3.5c.54 0 2.48.16 3.12 2.96-2.69.25-3.66-2.67-3.12-2.96z"/></svg>
                            Apple
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-zinc-100 flex-1"></div>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Oder mit E-Mail</span>
                        <div className="h-px bg-zinc-100 flex-1"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <TextInput 
                                label="E-Mail Adresse" 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@firma.ch"
                                icon="✉️"
                                required
                            />
                            <TextInput 
                                label="Passwort" 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <Button 
                            variant="solid" 
                            fullWidth 
                            label={isLoading ? "Lade..." : "Anmelden"}
                            disabled={isLoading}
                            type="submit"
                        />

                        <div className="flex items-center justify-between text-xs font-bold mt-6">
                            <label className="flex items-center gap-2 text-zinc-500 cursor-pointer">
                                <input type="checkbox" className="rounded accent-zinc-900" />
                                Angemeldet bleiben
                            </label>
                            <a href="#" className="text-olive-600 hover:underline">Passwort vergessen?</a>
                        </div>
                    </form>

                    {/* Registration Section */}
                    <div className="text-center pt-8 border-t border-zinc-100">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-3">Noch kein Konto?</p>
                        <button onClick={() => alert("Die Registrierung ist im Demo-Modus deaktiviert. Bitte nutzen Sie den Dev-Login.")} className="w-full border border-zinc-200 py-3 rounded-xl font-bold uppercase text-xs hover:bg-zinc-50 transition-colors text-zinc-900">
                            Kostenlos Registrieren
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
