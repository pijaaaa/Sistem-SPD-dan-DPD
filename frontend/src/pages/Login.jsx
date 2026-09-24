import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/common/FormField';
import { Button } from '../components/common/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Login gagal. Silakan coba lagi.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sistem SPD & DPD
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan login ke akun Anda
          </p>
        </div>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField 
              label="Email" 
              type="email" 
              autoComplete="email"
              {...register('email', { required: 'Email wajib diisi' })} 
              error={errors.email} 
            />
            
            <FormField 
              label="Password" 
              type="password" 
              autoComplete="current-password"
              {...register('password', { required: 'Password wajib diisi' })} 
              error={errors.password} 
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}