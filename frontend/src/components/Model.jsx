import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const MAX_ATTEMPTS = 3;

const Modal = ({ isOpen, onClose, onSuccess }) => {
  const [gifURL, setGifURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [clickAttempts, setClickAttempts] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      resetStateAndFetchGIF();
    }
  }, [isOpen]);

  const resetStateAndFetchGIF = async () => {
    setLoading(true);
    setValidationResult(null);
    setClickAttempts(0);
    setMessage('');
    try {
      const response = await axios.get(`${BACKEND_URL}/generate-gif`, {
        responseType: 'blob',
      });
      const gifBlob = response.data;
      const url = URL.createObjectURL(gifBlob);
      setGifURL(url);
    } catch (error) {
      console.error('Error fetching GIF:', error);
      setMessage('Failed to load CAPTCHA. Please close and try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateClick = async (event) => {
    const userX = Math.round(event.nativeEvent.offsetX);
    const userY = Math.round(event.nativeEvent.offsetY);

    try {
      const response = await axios.post(`${BACKEND_URL}/validate-click`, {
        user_coordinates: { x: userX, y: userY },
      });
      const { valid, stationary_dot } = response.data;

      setValidationResult({ valid, stationary_dot, user_x: userX, user_y: userY });

      if (valid) {
        onSuccess();
        onClose();
      } else {
        const newAttempts = clickAttempts + 1;
        setClickAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setMessage('Max attempts reached. Refreshing GIF...');
          await resetStateAndFetchGIF();
        } else {
          setMessage('Validation Failed! Try clicking within the radius of the ball again.');
        }
      }
    } catch (error) {
      console.error('Error validating click:', error);
      setMessage('An error occurred during validation. Please try again.');
    }
  };

  const handleClose = () => {
    setValidationResult(null);
    setMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-lg p-4 w-11/12 md:w-1/2 lg:w-1/3 relative"
            style={{ maxWidth: '400px' }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={handleClose}
              aria-label="Close Modal"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4 text-center">GIF Challenge</h2>

            {loading ? (
              <div className="flex justify-center items-center">
                <svg
                  className="animate-spin h-8 w-8 text-indigo-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              </div>
            ) : (
              <>
                <p className="text-center text-sm font-medium mb-2">
                  The ball is breathing (changing size) and the valid clicking range matches its radius.
                  Click within the ball's radius when it’s at full size.
                </p>
                <img
                  src={gifURL}
                  alt="GIF Challenge"
                  className="w-full h-auto cursor-pointer rounded border border-gray-200"
                  onClick={validateClick}
                  style={{ cursor: 'pointer' }}
                />
                {message && (
                  <div className="mt-4 text-center text-red-600 text-sm">
                    {message}
                  </div>
                )}
                {validationResult && !validationResult.valid && (
                  <div className="mt-2 text-center text-red-600 text-sm">
                    Validation Failed! You clicked: ({validationResult.user_x}, {validationResult.user_y})
                    {validationResult.stationary_dot && (
                      <> but the stationary dot is at: ({validationResult.stationary_dot[0]}, {validationResult.stationary_dot[1]})</>
                    )}
                    <div>
                      Make sure to click within the radius of the ball. The radius is about 30px at full size.
                    </div>
                  </div>
                )}
                {!loading && (
                  <div className="mt-2 text-center text-gray-600 text-xs">
                    Attempts: {clickAttempts}/{MAX_ATTEMPTS}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
