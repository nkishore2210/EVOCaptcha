import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Lock, User } from 'lucide-react';
import { motion } from 'framer-motion'

export default function MobileLogin() {
  const formRef = useRef(null);
  const [isChecked, setIsChecked] = React.useState(false);

  const handleInputFocus = (e) => {
    gsap.to(e.target, {
      scale: 1.05,
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });
  };

  const handleChange = () => {
    setIsChecked(!isChecked);
  };

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { y: '50px', opacity: 0 },
      { y: '0', opacity: 1, duration: 1, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Header Section */}
      <div className="bg-white p-6 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Mobile Verification</h1>
        <div className="mt-2 w-16 h-1 bg-[#046A38] mx-auto rounded-full"></div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-6" ref={formRef}>
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Login</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter your mobile number to receive OTP
            </p>
          </div>

          <form className="mt-8 space-y-6">
            <div className="form-control w-full">
              <label htmlFor="mobile-number" className="label">
                <span className="label-text text-lg font-medium text-gray-700">Mobile Number</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="mobile-number"
                  name="mobile"
                  type="tel"
                  required
                  placeholder="Enter your mobile number"
                  className="input input-bordered w-full pl-10 bg-white border-2 border-gray-200 rounded-lg h-12"
                  onFocus={handleInputFocus}
                />
              </div>
            </div>

            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isChecked}
                  onChange={handleChange}
                />
                <div
                  className={`w-6 h-6 border-2 rounded-md ${
                    isChecked ? 'border-green-500 bg-green-50' : 'border-gray-500 bg-white'
                  } transition-colors duration-200 ease-in-out`}
                >
                  <motion.svg
                    className="w-full h-full text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    initial="hidden"
                    animate={isChecked ? 'visible' : 'hidden'}
                    variants={{
                      visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 0.2 },
                      },
                      hidden: {
                        pathLength: 0,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      },
                    }}
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">I agree to the Terms & Conditions</span>
            </label>

            <button
              type="submit"
              className="btn w-full h-12 bg-[#046A38] hover:bg-[#035c31] text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Lock className="h-5 w-5" />
              Get OTP
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Need help? <a href="#" className="text-[#046A38] hover:underline">Contact Support</a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-sm text-gray-500">
        © 2024 Mobile Login. All rights reserved.
      </div>
    </div>
  );
}