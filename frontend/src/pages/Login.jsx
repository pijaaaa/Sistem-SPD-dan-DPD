import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Lock, RefreshCw } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  const LOGO_SIZE = 100;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, getValues } = useForm();

  const from = location.state?.from?.pathname || '/';

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const response = await api.get('/api/captcha');
      setCaptchaSvg(response.data.captcha);
      setCaptchaKey(response.data.key);
      setValue('captcha', '');
    } catch (error) {
      console.error('Failed to load captcha:', error);
      setErrorMsg('Gagal memuat captcha. Silakan refresh halaman.');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const onSubmit = async (data) => {
    setErrorMsg('');

    try {
      await login({ 
        email: data.email, 
        password: data.password,
        captcha: data.captcha,
        captcha_key: captchaKey
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
      loadCaptcha();
    }
  };

  return (
    <div 
      className="relative flex min-h-screen items-center justify-center p-4"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Latar.webp)',
          filter: 'blur(3px)',
          transform: 'scale(1.1)'
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div 
              className="bg-white rounded-2xl shadow-lg flex items-center justify-center p-3"
              style={{ 
                width: `${LOGO_SIZE}px`, 
                height: `${LOGO_SIZE}px` 
              }}
            >
              <img 
                src="/bsplogo.png" 
                alt="Logo" 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-emerald-700 mb-2">
              Sistem Surat Perjalanan Dinas - DPD
            </h2>
            <p className="text-gray-600 text-sm">
              Silakan login untuk melanjutkan
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  {...register('email', { required: 'Email wajib diisi' })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-gray-50"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password wajib diisi' })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-gray-50"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Kode Keamanan (Captcha)
                </label>
                <span className="text-[11px] text-emerald-700 font-medium">Anti Brute-Force</span>
              </div>

              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="flex-1 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-inner bg-white border border-emerald-200"
                  dangerouslySetInnerHTML={{
                    __html: captchaSvg || '<span class="text-xs text-slate-400 font-medium">Memuat kode...</span>',
                  }}
                />
                <button
                  type="button"
                  onClick={loadCaptcha}
                  disabled={captchaLoading}
                  title="Ganti gambar captcha"
                  className="h-12 w-12 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0"
                >
                  <RefreshCw className={`w-5 h-5 ${captchaLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <input
                  type="text"
                  maxLength={6}
                  autoComplete="off"
                  {...register('captcha', { 
                    required: 'Kode keamanan wajib diisi',
                    minLength: { value: 5, message: 'Kode keamanan minimal 5 karakter' }
                  })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 tracking-widest font-bold uppercase transition-all bg-gray-50"
                  placeholder="Ketik 5 kode di atas"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const captchaValue = getValues('captcha');
                      if (captchaValue && captchaValue.length >= 5) {
                        handleSubmit(onSubmit)();
                      }
                    }
                  }}
                />
              </div>
              {errors.captcha && (
                <p className="mt-1 text-sm text-red-500">{errors.captcha.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Login
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white text-sm mt-6 drop-shadow-lg">
          © 2026 Sistem Surat Perjalanan Dinas - DPD
        </p>
      </div>
    </div>
  );
}
