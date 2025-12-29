import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ChevronRight, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Modal from './Model'; // Ensure this path is correct

// Import images
import flagImage from '../assets/images/flag2.jpg';
import student from '../assets/images/students.jpg';
import farmer from '../assets/images/farmer.jpg';
import working from '../assets/images/working2.jpg';

export default function CombinedLogin() {
  // Aadhaar & Honeypot states
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [honeypotValue, setHoneypotValue] = useState('');
  const honeypotTriggeredRef = useRef(false);

  const [isChecked, setIsChecked] = useState(false);

  // Interaction Data States
  const [mouseSpeeds, setMouseSpeeds] = useState([]);
  const [mouseAccelerations, setMouseAccelerations] = useState([]);
  const [movementSmoothnessValues, setMovementSmoothnessValues] = useState([]);
  const directionChangesRef = useRef(0);
  const sessionStartRef = useRef(performance.now());
  const [timePerField, setTimePerField] = useState({});
  const [keystrokeDurations, setKeystrokeDurations] = useState([]);
  const [interKeyIntervals, setInterKeyIntervals] = useState([]);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [clickTimestamps, setClickTimestamps] = useState([]);
  const [sequenceOfClicks, setSequenceOfClicks] = useState([]);
  const [idleTimeBetweenActions, setIdleTimeBetweenActions] = useState([]);
  const [totalIdleTime, setTotalIdleTime] = useState(0);
  const [mousePositions, setMousePositions] = useState([]);

  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for timings and positions
  const keyDownTimes = useRef({});
  const lastKeyDownTimeRef = useRef(null);
  const lastInteractionTimeRef = useRef(sessionStartRef.current);
  const lastCursorPositionRef = useRef({ x: null, y: null, time: null });
  const lastMouseDirectionRef = useRef(null);
  const lastFocusTimeRef = useRef(null);
  const lastFocusFieldRef = useRef(null);

  const mouseSpeedsRef = useRef(mouseSpeeds);
  const mouseAccelerationsRef = useRef(mouseAccelerations);

  useEffect(() => {
    mouseSpeedsRef.current = mouseSpeeds;
  }, [mouseSpeeds]);

  useEffect(() => {
    mouseAccelerationsRef.current = mouseAccelerations;
  }, [mouseAccelerations]);

  // Utility functions
  const calculateStandardDeviation = (values) => {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return Math.sqrt(variance);
  };

  const calculatePathDeviation = () => {
    if (mousePositions.length < 2) return 0;
    const startPoint = mousePositions[0];
    const endPoint = mousePositions[mousePositions.length - 1];
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    if (deltaX === 0 && deltaY === 0) return 0;

    const A = deltaY;
    const B = -deltaX;
    const C = deltaX * startPoint.y - deltaY * startPoint.x;

    const distances = mousePositions.map((point) =>
      Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B)
    );

    return parseFloat(distances.reduce((a, b) => a + b, 0).toFixed(2));
  };

  useEffect(() => {
    const throttle = (func, limit) => {
      let lastFunc;
      let lastRan;
      return function (...args) {
        const context = this;
        if (!lastRan) {
          func.apply(context, args);
          lastRan = Date.now();
        } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(function () {
            if (Date.now() - lastRan >= limit) {
              func.apply(context, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      };
    };

    const MAX_HUMAN_ACCELERATION = 1000; 
    const THROTTLE_LIMIT = 20;

    const trackMouseMovement = throttle((event) => {
      const currentTime = performance.now();
      const lastCursorPosition = lastCursorPositionRef.current;

      if (lastCursorPosition.x !== null) {
        const dx = event.clientX - lastCursorPosition.x;
        const dy = event.clientY - lastCursorPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeElapsed = (currentTime - lastCursorPosition.time) / 1000;

        if (timeElapsed > 0 && timeElapsed < 1) {
          let speed = distance / timeElapsed;
          let acceleration =
            (speed - (mouseSpeedsRef.current.slice(-1)[0] || 0)) / timeElapsed;

          if (acceleration > MAX_HUMAN_ACCELERATION) {
            acceleration = MAX_HUMAN_ACCELERATION;
          } else if (acceleration < -MAX_HUMAN_ACCELERATION) {
            acceleration = -MAX_HUMAN_ACCELERATION;
          }

          setMouseSpeeds((prev) => [...prev, speed]);
          setMouseAccelerations((prev) => [...prev, acceleration]);

          const lastAcceleration = mouseAccelerationsRef.current.slice(-1)[0] || 0;
          const jerk = (acceleration - lastAcceleration) / timeElapsed;
          const squaredJerk = jerk * jerk;
          setMovementSmoothnessValues((prev) => [...prev, squaredJerk]);

          const currentDirection = Math.atan2(dy, dx);
          if (lastMouseDirectionRef.current !== null) {
            let angleDifference = Math.abs(currentDirection - lastMouseDirectionRef.current);
            if (angleDifference > Math.PI) {
              angleDifference = 2 * Math.PI - angleDifference;
            }
            if (angleDifference > (30 * Math.PI) / 180) {
              directionChangesRef.current += 1;
            }
          }
          lastMouseDirectionRef.current = currentDirection;
        }
      }

      setMousePositions((prev) => [...prev, { x: event.clientX, y: event.clientY }]);
      lastCursorPositionRef.current = { x: event.clientX, y: event.clientY, time: currentTime };

      const idleTime = currentTime - lastInteractionTimeRef.current;
      if (idleTime > 1000) {
        setIdleTimeBetweenActions((prev) => [...prev, idleTime]);
        setTotalIdleTime((prevTotalIdleTime) => prevTotalIdleTime + idleTime);
      }
      lastInteractionTimeRef.current = currentTime;
    }, THROTTLE_LIMIT);

    const handleClick = (event) => {
      const currentTime = performance.now();
      setClickTimestamps((prev) => [...prev, currentTime]);

      if (
        event.target.name === 'aadhaarNumberHidden' ||
        event.target.id === 'aadhaarNumberHidden'
      ) {
        honeypotTriggeredRef.current = true;
      }

      const buttonIdentifier =
        event.target.id ||
        event.target.getAttribute('data-action') ||
        event.target.getAttribute('name') ||
        event.target.tagName;
      setSequenceOfClicks((prev) => [...prev, buttonIdentifier]);

      lastInteractionTimeRef.current = currentTime;
    };

    const handleScroll = () => {
      lastInteractionTimeRef.current = performance.now();
    };

    const handleKeyDown = (event) => {
      const currentTime = performance.now();

      if (!keyDownTimes.current[event.code]) {
        keyDownTimes.current[event.code] = currentTime;

        if (lastKeyDownTimeRef.current !== null) {
          const interKeyTime = currentTime - lastKeyDownTimeRef.current;
          setInterKeyIntervals((prev) => [...prev, interKeyTime]);
        }

        if (event.code === 'Backspace') {
          setBackspaceCount((prev) => prev + 1);
        }

        lastKeyDownTimeRef.current = currentTime;
        lastInteractionTimeRef.current = currentTime;
      }
    };

    const handleKeyUp = (event) => {
      const currentTime = performance.now();

      if (keyDownTimes.current[event.code]) {
        const keyPressDuration = currentTime - keyDownTimes.current[event.code];
        setKeystrokeDurations((prev) => [...prev, keyPressDuration]);
        delete keyDownTimes.current[event.code];
      }
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (
        target.name === 'aadhaarNumberHidden' ||
        target.id === 'aadhaarNumberHidden'
      ) {
        honeypotTriggeredRef.current = true;
      }

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        target.addEventListener('keydown', handleKeyDown);
        target.addEventListener('keyup', handleKeyUp);
        lastFocusTimeRef.current = performance.now();
        lastFocusFieldRef.current = target.name || target.id || 'unknown';
      }
    };

    const handleFocusOut = (event) => {
      const target = event.target;
      if (lastFocusTimeRef.current) {
        const dwellTime = performance.now() - lastFocusTimeRef.current;
        const fieldName = lastFocusFieldRef.current;
        setTimePerField((prevTimes) => {
          const previousTime = prevTimes[fieldName] || 0;
          return {
            ...prevTimes,
            [fieldName]: previousTime + dwellTime,
          };
        });
        lastFocusTimeRef.current = null;
        lastFocusFieldRef.current = null;
      }
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        target.removeEventListener('keydown', handleKeyDown);
        target.removeEventListener('keyup', handleKeyUp);
      }
    };

    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const handleInputFocus = (e) => {
    gsap.to(e.target, {
      scale: 1.05,
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });
  };

  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '');
    if (/^\d{0,12}$/.test(value)) {
      setAadhaarNumber(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Aadhaar number must be exactly 12 digits.');
    }
  };

  const handleHoneypotChange = (e) => {
    setHoneypotValue(e.target.value);
    honeypotTriggeredRef.current = true;
  };

  const calculateTypingVariability = () => {
    const interKeyStdDev = calculateStandardDeviation(interKeyIntervals);
    const keystrokeDurationStdDev = calculateStandardDeviation(keystrokeDurations);
    return interKeyStdDev + keystrokeDurationStdDev;
  };

  const calculateClickConsistency = () => {
    const clickIntervalsCalculated = [];
    for (let i = 1; i < clickTimestamps.length; i++) {
      clickIntervalsCalculated.push(clickTimestamps[i] - clickTimestamps[i - 1]);
    }
    const stdDev = calculateStandardDeviation(clickIntervalsCalculated);
    return stdDev !== 0 ? 1 / stdDev : 0;
  };

  const calculateClickInterval = () => {
    const intervals = [];
    for (let i = 1; i < clickTimestamps.length; i++) {
      intervals.push(clickTimestamps[i] - clickTimestamps[i - 1]);
    }
    if (intervals.length === 0) return 0;
    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  };

  const calculateMetrics = () => {
    const endTime = performance.now();
    const sessionDurationInSeconds = (endTime - sessionStartRef.current) / 1000;

    const calculatedMouseSpeed =
      mouseSpeeds.length > 0
        ? mouseSpeeds.reduce((a, b) => a + b, 0) / mouseSpeeds.length
        : 0;

    const calculatedMovementSmoothness =
      movementSmoothnessValues.length > 0
        ? 1 / (movementSmoothnessValues.reduce((a, b) => a + b, 0) / movementSmoothnessValues.length)
        : 0;

    const calculatedAcceleration =
      mouseAccelerations.length > 0
        ? mouseAccelerations.reduce((a, b) => a + b, 0) / mouseAccelerations.length
        : 0;

    const calculatedDirectionChanges = directionChangesRef.current;
    const calculatedPathDeviation = calculatePathDeviation();

    const totalKeystrokes = keystrokeDurations.length;
    const calculatedTypingSpeed =
      sessionDurationInSeconds > 0
        ? (totalKeystrokes / sessionDurationInSeconds) * 60
        : 0;

    const calculatedInterKeyInterval =
      interKeyIntervals.length > 0
        ? interKeyIntervals.reduce((a, b) => a + b, 0) / interKeyIntervals.length
        : 0;

    const calculatedKeystrokeDuration =
      keystrokeDurations.length > 0
        ? keystrokeDurations.reduce((a, b) => a + b, 0) / keystrokeDurations.length
        : 0;

    const calculatedTypingVariability = calculateTypingVariability();
    const rhythmicTypingScore = calculateStandardDeviation(interKeyIntervals);

    const totalClicks = clickTimestamps.length;
    const calculatedClickRate =
      sessionDurationInSeconds > 0 ? totalClicks / sessionDurationInSeconds : 0;
    const calculatedClickConsistency = calculateClickConsistency();
    const calculatedTotalIdleTime = totalIdleTime / 1000;
    const calculatedIdleTimeBetweenActions =
      idleTimeBetweenActions.length > 0
        ? idleTimeBetweenActions.reduce((a, b) => a + b, 0) / idleTimeBetweenActions.length
        : 0;

    const calculatedClickInterval = calculateClickInterval();

    return {
      Mouse_Speed: parseFloat(calculatedMouseSpeed.toFixed(2)),
      Movement_Smoothness: parseFloat(calculatedMovementSmoothness.toFixed(2)),
      Acceleration: parseFloat(calculatedAcceleration.toFixed(2)),
      Direction_Changes: calculatedDirectionChanges,
      Total_Session_Time: parseFloat(sessionDurationInSeconds.toFixed(2)),
      Path_Deviation: calculatedPathDeviation,
      Time_per_Field: timePerField,
      Time_to_Submit: parseFloat(sessionDurationInSeconds.toFixed(2)),
      Typing_Speed: parseFloat(calculatedTypingSpeed.toFixed(2)),
      Inter_Key_Interval: parseFloat(calculatedInterKeyInterval.toFixed(2)),
      Keystroke_Duration: parseFloat(calculatedKeystrokeDuration.toFixed(2)),
      Typing_Variability: parseFloat(calculatedTypingVariability.toFixed(2)),
      Rhythmic_Typing_Score: parseFloat(rhythmicTypingScore.toFixed(2)),
      Backspace_Count: backspaceCount,
      Click_Rate: parseFloat(calculatedClickRate.toFixed(2)),
      Click_Consistency: parseFloat(calculatedClickConsistency.toFixed(2)),
      Click_Interval: parseFloat(calculatedClickInterval.toFixed(2)),
      Sequence_of_Clicks: sequenceOfClicks.length,
      Idle_Time_Between_Actions: parseFloat(calculatedIdleTimeBetweenActions.toFixed(2)),
      Idle_Time_Before_CAPTCHA: 0,
      Total_Idle_Time: parseFloat(calculatedTotalIdleTime.toFixed(2)),
    };
  };

  const resetInteractionData = () => {
    setMouseSpeeds([]);
    setMouseAccelerations([]);
    setMovementSmoothnessValues([]);
    directionChangesRef.current = 0;
    setTimePerField({});
    setKeystrokeDurations([]);
    setInterKeyIntervals([]);
    setBackspaceCount(0);
    setClickTimestamps([]);
    setSequenceOfClicks([]);
    setIdleTimeBetweenActions([]);
    setTotalIdleTime(0);
    setMousePositions([]);
    lastKeyDownTimeRef.current = null;
    lastInteractionTimeRef.current = sessionStartRef.current;
    lastCursorPositionRef.current = { x: null, y: null, time: null };
    lastMouseDirectionRef.current = null;
    lastFocusTimeRef.current = null;
    lastFocusFieldRef.current = null;
    honeypotTriggeredRef.current = false;
    setHoneypotValue('');
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBotDetected, setIsBotDetected] = useState(false);

  const handleLogin = async () => {
    if (honeypotTriggeredRef.current || honeypotValue) {
      setErrorMessage('Bot detected.');
      return;
    }

    const metrics = calculateMetrics();
    const formattedData = {
      ...metrics,
      Time_per_Field: timePerField,
    };

    setIsLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${BACKEND_URL}/api/predict`, formattedData, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.prediction.toLowerCase() === 'bot') {
        setIsBotDetected(true);
        setIsModalOpen(true);
      } else if (response.data.prediction.toLowerCase() === 'human') {
        setPredictionResult(response.data);
      }
    } catch (error) {
      console.error('Error sending interaction data to backend:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(`Error: ${JSON.stringify(error.response.data.error)}`);
      } else {
        setErrorMessage('Failed to send data to the server. Please try again.');
      }
      return;
    } finally {
      setIsLoading(false);
    }

    sessionStartRef.current = performance.now();
    resetInteractionData();
  };

  const handleModalSuccess = () => {
    setPredictionResult({
      prediction: 'human',
      probability: 1.0,
      cluster_label: null,
    });
    setIsBotDetected(false);
    setIsModalOpen(false);
  };

  const handleCheckboxChange = async (e) => {
    setIsChecked(e.target.checked);
    if (e.target.checked) {
      await handleLogin();
    }
  };

  const formRefAnim = useRef(null);
  const carouselRefAnim = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    gsap.fromTo(
      formRefAnim.current,
      { x: '-100%', opacity: 0 },
      { x: '0%', opacity: 1, duration: 1.5, ease: 'power3.out' }
    );

    gsap.fromTo(
      carouselRefAnim.current,
      { x: '100%', opacity: 0 },
      { x: '0%', opacity: 1, duration: 1.5, ease: 'power3.out' }
    );

    const slidesInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(slidesInterval);
  }, []);

  const slides = [
    {
      id: 1,
      image: flagImage,
      alt: 'Flag of India',
      title: 'Pride of India',
      description:
        'Aadhar verification ensures every citizen is part of the digital revolution, empowering India for a brighter future.',
    },
    {
      id: 2,
      image: student,
      alt: 'Easy Verification',
      title: 'Enabling Education',
      description:
        'Aadhar unlocks access to scholarships and academic opportunities, shaping the future of young India.',
    },
    {
      id: 3,
      image: farmer,
      alt: 'Quick Access',
      title: 'Empowering Farmers',
      description:
        'Access government schemes and subsidies seamlessly with Aadhar-based services tailored for the backbone of our nation.',
    },
    {
      id: 4,
      image: working,
      alt: 'Supporting Workforce',
      title: 'Supporting the Workforce',
      description:
        'Aadhar helps workers secure their rights, enabling access to essential services and opportunities for growth.',
    },
  ];

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // State for GIF refresh attempts
  const [clickAttempts, setClickAttempts] = useState(0);
  const [gifRefreshKey, setGifRefreshKey] = useState(0); // To force reloading the GIF

  const handleGifClick = (e) => {
    // Use offsetX and offsetY to get coordinates relative to the image
    const x = Math.round(e.nativeEvent.offsetX);
    const y = Math.round(e.nativeEvent.offsetY);

    axios.post(`${BACKEND_URL}/validate-click`, {
      user_coordinates: { x, y },
    })
    .then((res) => {
      if (res.data.valid) {
        // Success
        handleModalSuccess();
      } else {
        // Failed attempt
        const newAttempts = clickAttempts + 1;
        setClickAttempts(newAttempts);
        setErrorMessage(`Validation Failed! Try clicking the stationary dot again. You clicked: (${x}, ${y}), stationary at: (${res.data.stationary_dot})`);

        if (newAttempts >= 3) {
          // Refresh GIF after 3 failed attempts
          setGifRefreshKey((prev) => prev + 1);
          setClickAttempts(0);
          setErrorMessage('GIF refreshed. Please try again.');
        }
      }
    })
    .catch((err) => {
      console.error('Error validating click:', err);
      setErrorMessage('An error occurred during validation. Please try again.');
    });
  };

  return (
    <div className="flex flex-col md:flex-row-reverse min-h-screen bg-gray-100 overflow-hidden">
      {/* Login Form Column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8" ref={formRefAnim}>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verify Your Identity</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter the required details to verify your email or mobile number
            </p>
          </div>
          <form className="mt-8 space-y-6">
            <div className="form-control w-full">
              <label htmlFor="aadhaarNumber" className="label">
                <span className="label-text text-lg font-bold text-black">aadhare Number</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  type="text"
                  required
                  placeholder="Enter 12 Digit Aadhaar Number"
                  className="input input-bordered w-full pl-10 bg-white"
                  onChange={handleAadhaarChange}
                  value={aadhaarNumber}
                  maxLength={12}
                  onFocus={handleInputFocus}
                  aria-invalid={!!errorMessage}
                  aria-describedby="aadhaarError"
                />
              </div>
              {errorMessage && <p id="aadhaarError" style={{ color: 'red' }}>{errorMessage}</p>}
            </div>

            {/* Honeypot Field */}
            <div style={{ position: 'absolute', left: '-9999px', top: '0px' }}>
              <label htmlFor="aadhaarNumberHidden">Phone Number:</label>
              <input
                type="text"
                id="aadhaarNumberHidden"
                name="aadhaarNumberHidden"
                value={honeypotValue}
                onChange={handleHoneypotChange}
                autoComplete="off"
                tabIndex="-1"
              />
            </div>

            <label className="inline-flex items-center cursor-pointer ml-20">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isChecked}
                  onChange={handleCheckboxChange}
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
                    animate={isChecked && predictionResult?.prediction.toLowerCase() === 'human' ? 'visible' : 'hidden'}
                    variants={{
                      visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: { duration: 0.2, ease: 'easeInOut' },
                      },
                      hidden: {
                        pathLength: 0,
                        opacity: 0,
                        transition: { duration: 0.2, ease: 'easeInOut' },
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
              <span className="ml-3 text-lg font-medium text-gray-700">Confirm you're human</span>
              {predictionResult?.prediction.toLowerCase() === 'human' && (
                <svg className="ml-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </label>

            <div>
              <button
                type="button"
                className="btn bg-[#046A38] text-white w-full flex justify-center relative hover:bg-[#FF671F] border-none focus:ring-0"
                disabled={!isChecked || aadhaarNumber.length !== 12 || isLoading}
                onClick={() => {
                  alert('Proceeding with OTP...');
                }}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-white text-xl" aria-hidden="true" />
                    </span>
                    Login with OTP
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Carousel Column */}
      <div className="w-full md:w-1/2 bg-indigo-600 relative overflow-hidden" ref={carouselRefAnim}>
        <div className="absolute inset-0 flex items-center justify-center">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="absolute inset-0 object-cover w-full h-full"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black opacity-50"></div>
              <div className="absolute text-white text-center px-4">
                <h3 className="text-4xl font-bold mb-4">{slide.title}</h3>
                <p className="text-xl">{slide.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-5 left-0 right-0 flex justify-center space-x-2 ">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>

        <button
          className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white bg-opacity-30 rounded-full p-2 focus:outline-none hover:bg-opacity-50 transition duration-150 ease-in-out mt-20"
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white bg-opacity-30 rounded-full p-2 focus:outline-none hover:bg-opacity-50 transition duration-150 ease-in-out mt-20"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg flex items-center space-x-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Detecting...</span>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      >
        {/* CAPTCHA GIF inside the Modal */}
        <div className="flex flex-col items-center justify-center p-4" style={{ width: '200px' }}>
          <p className="text-center text-sm font-medium mb-2">Please click on the stationary dot</p>
          <img
            key={gifRefreshKey}
            src={`${BACKEND_URL}/generate-gif?key=${gifRefreshKey}`}
            alt="CAPTCHA"
            className="my-2 border border-gray-300 rounded cursor-pointer"
            style={{
              maxWidth: '150px',
              width: '100%',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
            }}
            loading="lazy"
            onClick={handleGifClick}
          />
          {errorMessage && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '5px' }}>{errorMessage}</p>}
          <p className="text-xs text-gray-500 mt-2">Attempts: {clickAttempts}/3</p>
        </div>
      </Modal>

      {predictionResult && !isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {predictionResult.prediction.toLowerCase() === 'bot' && (
            <div className="bg-white p-6 rounded-md shadow-lg text-center">
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                You are classified as a bot!
              </h3>
              <button
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md"
                onClick={() => setPredictionResult(null)}
              >
                Close
              </button>
            </div>
          )}
          {predictionResult.prediction.toLowerCase() === 'human' && (
            <div className="bg-white p-6 rounded-md shadow-lg text-center">
              <h3 className="text-2xl font-bold text-green-600 mb-4">
                You have been verified as human!
              </h3>
              <button
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md"
                onClick={() => setPredictionResult(null)}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      <footer className="absolute bottom-0 w-full p-4 text-center text-gray-500">
        <p>Note: This page collects data for research purposes.</p>
      </footer>
    </div>
  );
}
