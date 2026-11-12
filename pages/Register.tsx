import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useReducedMotion } from 'framer-motion';

const defaultForm = {
  username: '',
  email: '',
  password: ''
};

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reducedMotion = useReducedMotion();
  const daisyRef = useRef<HTMLButtonElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const interactionAnimations = useRef<Animation[]>([]);

  const handleChange = (field: keyof typeof defaultForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.email || !form.password) {
      setError('Please complete every field.');
      return;
    }

    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.auth.register(form);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const container = particlesRef.current;
    const daisy = daisyRef.current;
    if (!container || !daisy || reducedMotion !== false) return;

    const animations: Animation[] = [];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle bg-yellow-400/25 dark:bg-yellow-200/10';
      const size = Math.random() * 4 + 2;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.opacity = (Math.random() * 0.4).toString();
      container.appendChild(p);
      
      animations.push(p.animate([
        { transform: 'translate(0,0)', opacity: p.style.opacity },
        { transform: `translate(${(Math.random()-0.5)*100}px, ${(Math.random()-0.5)*100}px)`, opacity: 0 }
      ], { duration: Math.random() * 2000 + 2000, fill: 'forwards' }));
    }
    const center = daisy.querySelector('.flower-center');
    if (center) animations.push(center.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: 300, duration: 1500, fill: 'backwards',
    }));

    const petals = Array.from(daisy.querySelectorAll('.petal'));
    for (let i = petals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [petals[i], petals[j]] = [petals[j], petals[i]];
    }
    petals.forEach((petal, index) => {
      animations.push(petal.animate([{ opacity: 0 }, { opacity: 1 }], {
        delay: 600 + index * 40, duration: 800, fill: 'backwards',
      }));
    });

    return () => {
      animations.forEach(animation => animation.cancel());
      interactionAnimations.current.forEach(animation => animation.cancel());
      interactionAnimations.current = [];
      container.replaceChildren();
    };
  }, [reducedMotion]);

  const handleBloomInteraction = () => {
    const daisy = daisyRef.current;
    if (!daisy || reducedMotion !== false) return;

    interactionAnimations.current.forEach(animation => animation.cancel());
    interactionAnimations.current = Array.from(daisy.querySelectorAll('.petal'), petal => {
      return petal.animate([{ scale: '1' }, { scale: '1.1' }, { scale: '1' }], {
        delay: Math.random() * 500, duration: 1200, easing: 'ease-in-out',
      });
    });
    interactionAnimations.current.push(daisy.animate([
      { transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' },
      { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' },
    ], { duration: 2000, easing: 'ease-in-out' }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface dark:bg-gray-900 font-sans transition-colors duration-500">
      
      {/* Left Side: Art & Poetry */}
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
        
        <button
          type="button"
          aria-label="让花朵绽放"
          ref={daisyRef}
          className="daisy-container w-64 h-64 md:w-96 md:h-96 cursor-pointer mb-8 drop-shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
          onClick={handleBloomInteraction}
        >
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
            <defs>
              <filter id="innerPetalShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" />
                <feOffset dx="0" dy="0.5" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.15" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="outerOverlapShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" /> 
                <feOffset dx="-0.3" dy="0.3" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.08" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Stem */}
            <path d="M100 115 Q98 160 100 200" stroke="#5F8020" strokeWidth="3" fill="none" strokeLinecap="round" className="dark:stroke-green-700" />
            
            {/* Leaves */}
            <path d="M100 180 Q80 175 70 160 Q75 150 85 155 Q90 145 100 160 Z" fill="#4F6B1B" className="dark:fill-green-800" />
            <path d="M100 165 Q115 160 125 145 Q120 135 110 140 Q105 130 100 145 Z" fill="#5F8020" className="dark:fill-green-700" />

            {/* Petals Outer Even */}
            <g className="fill-white dark:fill-gray-300"> 
              {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(deg => (
                <ellipse key={deg} className="petal" cx="100" cy="100" rx="4.5" ry="28" transform={`rotate(${deg} 100 100) translate(0 -34)`} />
              ))}
            </g>

            {/* Petals Outer Odd */}
            <g className="fill-[#FAFAFA] dark:fill-gray-400" filter="url(#outerOverlapShadow)">
              {[18, 54, 90, 126, 162, 198, 234, 270, 306, 342].map(deg => (
                <ellipse key={deg} className="petal" cx="100" cy="100" rx="4.5" ry="28" transform={`rotate(${deg} 100 100) translate(0 -34)`} />
              ))}
            </g>

            {/* Petals Inner Mid */}
            <g className="fill-white dark:fill-gray-200" filter="url(#innerPetalShadow)">
              {[9, 45, 81, 117, 153, 189, 225, 261, 297, 333].map(deg => (
                <ellipse key={deg} className="petal" cx="100" cy="100" rx="4" ry="25" transform={`rotate(${deg} 100 100) translate(0 -31)`} />
              ))}
              {[27, 63, 99, 135, 171, 207, 243, 279, 315, 351].map(deg => (
                <ellipse key={deg} className="petal" cx="100" cy="100" rx="3.8" ry="24" transform={`rotate(${deg} 100 100) translate(0 -30)`} />
              ))}
            </g>

            {/* Petals Inner Dense */}
            <g className="fill-[#FFFAEA] dark:fill-gray-100" filter="url(#innerPetalShadow)">
              {[5, 23, 41, 59, 77, 95, 113, 131, 149, 167, 185, 203, 221, 239, 257, 275, 293, 311, 329, 347].map(deg => (
                <ellipse key={deg} className="petal" cx="100" cy="100" rx="3" ry="20" transform={`rotate(${deg} 100 100) translate(0 -28)`} />
              ))}
            </g>

            {/* Flower Center */}
            <g className="flower-center">
              <circle cx="100" cy="100" r="16" fill="#FFC200" className="dark:fill-yellow-600" />
              <circle cx="100" cy="100" r="13" fill="#FFD700" className="dark:fill-yellow-500" />
              <g fill="#B8860B" opacity="0.5" className="dark:fill-yellow-800">
                <circle cx="96" cy="96" r="1" />
                <circle cx="104" cy="96" r="1" />
                <circle cx="100" cy="100" r="1" />
                <circle cx="96" cy="104" r="1" />
                <circle cx="104" cy="104" r="1" />
                <circle cx="100" cy="92" r="1" />
                <circle cx="100" cy="108" r="1" />
                <circle cx="92" cy="100" r="1" />
                <circle cx="108" cy="100" r="1" />
              </g>
            </g>
          </svg>
        </button>
      </div>

      {/* Right Side: Registration Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-surface dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-sans">让我访问！</h1>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input
                  id="register-username"
                  name="username"
                  autoComplete="username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={form.username}
                  onChange={handleChange('username')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="jane-doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  id="register-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  spellCheck={false}
                  value={form.email}
                  onChange={handleChange('email')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  id="register-password"
                  name="password"
                  autoComplete="new-password"
                  type="password"
                  enterKeyHint="done"
                  minLength={12}
                  aria-describedby="register-password-help"
                  value={form.password}
                  onChange={handleChange('password')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-surface dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="Minimum 12 characters"
                  required
                />
                <p id="register-password-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">Minimum 12 characters.</p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-3 text-lg bg-accent-600 text-white hover:bg-accent-700 rounded-xl transition-colors"
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-600 dark:text-accent-300 font-medium hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
