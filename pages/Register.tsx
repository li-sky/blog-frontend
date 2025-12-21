import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

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
  
  // Refs for animation
  const daisyRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

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
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Particles
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    // Clear existing particles if any (though useEffect runs once)
    container.innerHTML = '';

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
      
      p.animate([
        { transform: 'translate(0,0)', opacity: p.style.opacity },
        { transform: `translate(${(Math.random()-0.5)*100}px, ${(Math.random()-0.5)*100}px)`, opacity: 0 }
      ], { duration: Math.random()*8000 + 4000, iterations: Infinity });
    }
  }, []);

  // Bloom Animation
  useEffect(() => {
    // Collect all petals
    const petals = Array.from(document.querySelectorAll('.petal')) as SVGElement[];
    const center = document.querySelector('.flower-center') as SVGElement;

    if (!center || petals.length === 0) return;

    // 1. Show center
    setTimeout(() => {
      center.style.opacity = '1';
    }, 300);

    // 2. Shuffle petals
    const shuffledPetals = [...petals];
    for (let i = shuffledPetals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPetals[i], shuffledPetals[j]] = [shuffledPetals[j], shuffledPetals[i]];
    }

    // 3. Show petals
    shuffledPetals.forEach((petal, index) => {
      setTimeout(() => {
        petal.style.opacity = '1';
      }, 600 + index * 40);
    });
  }, []);

  // Interaction: Bloom Button / Click on Flower
  const handleBloomInteraction = () => {
    const petals = document.querySelectorAll('.petal') as NodeListOf<SVGElement>;
    const daisy = daisyRef.current;

    petals.forEach((petal) => {
      const currentTransform = petal.getAttribute('transform') || '';
      // Extract rotation and translation if needed, but here we just append scale
      // Note: The original snippet used getAttribute('transform') which is static in SVG attributes
      // We need to be careful not to overwrite the base transform permanently or mess it up.
      // The CSS transition handles the smooth change.
      
      const delay = Math.random() * 500;
      
      setTimeout(() => {
        petal.style.transform = `${currentTransform} scale(1.1)`;
        setTimeout(() => {
          petal.style.transform = ''; // Reset to CSS defined or attribute defined
        }, 600);
      }, delay);
    });
    
    if (daisy) {
      daisy.style.animation = 'none';
      void daisy.offsetWidth; // Trigger reflow
      daisy.style.animation = 'sway 2s ease-in-out infinite';
      
      setTimeout(() => {
        daisy.style.animation = 'sway 7s ease-in-out infinite';
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-gray-900 font-sans transition-colors duration-500">
      
      {/* Left Side: Art & Poetry */}
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />
        
        <div 
          ref={daisyRef}
          className="daisy-container w-64 h-64 md:w-96 md:h-96 cursor-pointer mb-8 animate-sway drop-shadow-xl"
          onClick={handleBloomInteraction}
        >
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
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
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-sans">让我访问！</h2>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={handleChange('username')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="jane-doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 focus:ring-2 focus:ring-yellow-200 dark:focus:ring-yellow-900 focus:border-yellow-400 dark:focus:border-yellow-700 transition-all outline-none"
                  placeholder="Minimum 12 characters"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-3 text-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl transition-colors" 
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-yellow-600 dark:text-yellow-400 font-medium hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
