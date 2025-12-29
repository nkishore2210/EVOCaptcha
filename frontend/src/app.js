import React, { useState, useEffect, useRef } from 'react';
import './components/styles.css';
import axios from 'axios';

// Constants for thresholds
const MAX_HUMAN_ACCELERATION = 1000; // Adjusted threshold

const Portal = () => {
  // State variables
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Honeypot interaction flag
  const honeypotTriggeredRef = useRef(false);
  const [honeypotValue, setHoneypotValue] = useState(''); // Honeypot field

  // State variables for interaction data
  const [mouseSpeeds, setMouseSpeeds] = useState([]);
  const [mouseAccelerations, setMouseAccelerations] = useState([]);
  const [movementSmoothnessValues, setMovementSmoothnessValues] = useState([]);
  const directionChangesRef = useRef(0);

  const sessionStartRef = useRef(performance.now());

  const [timePerField, setTimePerField] = useState({});
  const [keystrokeDurations, setKeystrokeDurations] = useState([]);
  const [interKeyIntervals, setInterKeyIntervals] = useState([]);
  const [backspaceCount, setBackspaceCount] = useState(0); // Backspace count

  const [clickTimestamps, setClickTimestamps] = useState([]);
  const [sequenceOfClicks, setSequenceOfClicks] = useState([]);

  const [idleTimeBetweenActions, setIdleTimeBetweenActions] = useState([]);
  const [totalIdleTime, setTotalIdleTime] = useState(0);

  // Prediction result state
  const [predictionResult, setPredictionResult] = useState(null);

  // Refs for tracking events
  const keyDownTimes = useRef({});
  const lastKeyDownTimeRef = useRef(null);
  const lastInteractionTimeRef = useRef(sessionStartRef.current);
  const lastCursorPositionRef = useRef({ x: null, y: null, time: null });
  const lastMouseDirectionRef = useRef(null);
  const lastFocusTimeRef = useRef(null);
  const lastFocusFieldRef = useRef(null);

  // Refs to hold the latest mouseSpeeds and mouseAccelerations
  const mouseSpeedsRef = useRef(mouseSpeeds);
  const mouseAccelerationsRef = useRef(mouseAccelerations);

  // Update refs whenever mouseSpeeds or mouseAccelerations change
  useEffect(() => {
    mouseSpeedsRef.current = mouseSpeeds;
  }, [mouseSpeeds]);

  useEffect(() => {
    mouseAccelerationsRef.current = mouseAccelerations;
  }, [mouseAccelerations]);

  // Utility function to calculate standard deviation
  const calculateStandardDeviation = (values) => {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return Math.sqrt(variance);
  };

  useEffect(() => {
    // Throttle function to limit the frequency of event handler execution
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

    // Throttle limit in milliseconds
    const THROTTLE_LIMIT = 20; // Adjust as needed

    const trackMouseMovement = throttle((event) => {
      const currentTime = performance.now();
      const lastCursorPosition = lastCursorPositionRef.current;

      if (lastCursorPosition.x !== null) {
        const dx = event.clientX - lastCursorPosition.x;
        const dy = event.clientY - lastCursorPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeElapsed = (currentTime - lastCursorPosition.time) / 1000; // in seconds

        if (timeElapsed > 0 && timeElapsed < 1) {
          let speed = distance / timeElapsed; // pixels per second
          let acceleration = (speed - (mouseSpeedsRef.current.slice(-1)[0] || 0)) / timeElapsed;

          // Cap acceleration at a human threshold
          if (acceleration > MAX_HUMAN_ACCELERATION) {
            acceleration = MAX_HUMAN_ACCELERATION;
          } else if (acceleration < -MAX_HUMAN_ACCELERATION) {
            acceleration = -MAX_HUMAN_ACCELERATION;
          }

          // Collect mouse speeds and accelerations
          setMouseSpeeds((prevSpeeds) => [...prevSpeeds, speed]);
          setMouseAccelerations((prevAccelerations) => [...prevAccelerations, acceleration]);

          // Movement Smoothness can be calculated using the squared jerk (derivative of acceleration)
          const lastAcceleration = mouseAccelerationsRef.current.slice(-1)[0] || 0;
          const jerk = (acceleration - lastAcceleration) / timeElapsed;
          const squaredJerk = jerk * jerk;
          setMovementSmoothnessValues((prevValues) => [...prevValues, squaredJerk]);

          // Calculate direction changes
          const currentDirection = Math.atan2(dy, dx);
          if (lastMouseDirectionRef.current !== null) {
            let angleDifference = Math.abs(currentDirection - lastMouseDirectionRef.current);
            if (angleDifference > Math.PI) {
              angleDifference = 2 * Math.PI - angleDifference;
            }
            if (angleDifference > (30 * Math.PI) / 180) {
              // Threshold of 30 degrees
              directionChangesRef.current += 1;
            }
          }
          lastMouseDirectionRef.current = currentDirection;
        }
      }

      lastCursorPositionRef.current = { x: event.clientX, y: event.clientY, time: currentTime };

      // Calculate idle time between actions
      const idleTime = currentTime - lastInteractionTimeRef.current;
      if (idleTime > 1000) { // Idle time threshold in ms
        setIdleTimeBetweenActions((prevIdleTimes) => [...prevIdleTimes, idleTime]);
        setTotalIdleTime((prevTotalIdleTime) => prevTotalIdleTime + idleTime);
      }
      lastInteractionTimeRef.current = currentTime;
    }, THROTTLE_LIMIT);

    const handleClick = (event) => {
      const currentTime = performance.now();
      setClickTimestamps((prevTimestamps) => [...prevTimestamps, currentTime]);

      // Check if honeypot was clicked
      if (
        event.target.name === 'aadhaarNumber' &&
        event.target.id === 'aadhaarNumberHidden'
      ) {
        honeypotTriggeredRef.current = true;
        console.log('Honeypot field was clicked.');
      }

      // Capture specific identifier for the clicked element
      const buttonIdentifier =
        event.target.id ||
        event.target.getAttribute('data-action') ||
        event.target.getAttribute('name') ||
        event.target.tagName;
      setSequenceOfClicks((prevSequence) => [...prevSequence, buttonIdentifier]);

      lastInteractionTimeRef.current = currentTime;
    };

    const handleScroll = () => {
      const currentTime = performance.now();
      lastInteractionTimeRef.current = currentTime;
      // Additional scroll-related metrics can be added here if needed
    };

    // Key event handlers
    const handleKeyDown = (event) => {
      const currentTime = performance.now();

      if (!keyDownTimes.current[event.code]) {
        keyDownTimes.current[event.code] = currentTime;

        // Calculate inter-key interval
        if (lastKeyDownTimeRef.current !== null) {
          const interKeyTime = currentTime - lastKeyDownTimeRef.current;
          setInterKeyIntervals((prevIntervals) => [...prevIntervals, interKeyTime]);
        }

        // Check for backspace key
        if (event.code === 'Backspace') {
          setBackspaceCount((prevCount) => prevCount + 1);
        }

        lastKeyDownTimeRef.current = currentTime;
        lastInteractionTimeRef.current = currentTime;
      }
    };

    const handleKeyUp = (event) => {
      const currentTime = performance.now();

      if (keyDownTimes.current[event.code]) {
        const keyPressDuration = currentTime - keyDownTimes.current[event.code];
        // Record keystroke duration (key press duration)
        setKeystrokeDurations((prevDurations) => [...prevDurations, keyPressDuration]);

        delete keyDownTimes.current[event.code];
      }
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      // Check if honeypot was focused
      if (
        target.name === 'aadhaarNumber' &&
        target.id === 'aadhaarNumberHidden'
      ) {
        honeypotTriggeredRef.current = true;
        console.log('Honeypot field was focused.');
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

    // Event listeners
    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Aadhaar number input handler with validation
  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '');
    if (/^\d{0,12}$/.test(value)) {
      setAadhaarNumber(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Aadhaar number must be exactly 12 digits.');
    }
  };

  // Honeypot change handler
  const handleHoneypotChange = (e) => {
    setHoneypotValue(e.target.value);
    honeypotTriggeredRef.current = true; // Mark honeypot as triggered
    console.log('Honeypot field changed:', e.target.value);
  };

  // Function to calculate typing variability
  const calculateTypingVariability = () => {
    const interKeyStdDev = calculateStandardDeviation(interKeyIntervals);
    const keystrokeDurationStdDev = calculateStandardDeviation(keystrokeDurations);
    return interKeyStdDev + keystrokeDurationStdDev;
  };

  // Function to calculate click consistency
  const calculateClickConsistency = () => {
    const clickIntervalsCalculated = [];
    for (let i = 1; i < clickTimestamps.length; i++) {
      clickIntervalsCalculated.push(clickTimestamps[i] - clickTimestamps[i - 1]);
    }
    const stdDev = calculateStandardDeviation(clickIntervalsCalculated);
    return stdDev !== 0 ? 1 / stdDev : 0;
  };

  // Function to calculate metrics and return them
  const calculateMetrics = () => {
    // Capture the end time of the session
    const endTime = performance.now();
    const sessionDurationInSeconds = (endTime - sessionStartRef.current) / 1000; // Convert milliseconds to seconds

    // Mouse metrics
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

    // Typing metrics
    const totalKeystrokes = keystrokeDurations.length;

    const calculatedTypingSpeed =
      sessionDurationInSeconds > 0
        ? (totalKeystrokes / sessionDurationInSeconds) * 60
        : 0; // chars per minute

    const calculatedInterKeyInterval =
      interKeyIntervals.length > 0
        ? interKeyIntervals.reduce((a, b) => a + b, 0) / interKeyIntervals.length
        : 0;

    const calculatedKeystrokeDuration =
      keystrokeDurations.length > 0
        ? keystrokeDurations.reduce((a, b) => a + b, 0) / keystrokeDurations.length
        : 0;

    const calculatedTypingVariability = calculateTypingVariability();

    const rhythmicTypingScore = calculateStandardDeviation(interKeyIntervals); // Rhythmic_Typing_Score

    // Click metrics
    const totalClicks = clickTimestamps.length;
    const calculatedClickRate =
      sessionDurationInSeconds > 0 ? totalClicks / sessionDurationInSeconds : 0; // clicks/sec

    const calculatedClickConsistency = calculateClickConsistency();

    // Idle time metrics
    const calculatedTotalIdleTime = totalIdleTime / 1000; // Convert ms to s

    const calculatedIdleTimeBetweenActions =
      idleTimeBetweenActions.length > 0
        ? idleTimeBetweenActions.reduce((a, b) => a + b, 0) / idleTimeBetweenActions.length
        : 0;

    // Calculate Click Interval
    const calculateClickInterval = () => {
      const intervals = [];
      for (let i = 1; i < clickTimestamps.length; i++) {
        intervals.push(clickTimestamps[i] - clickTimestamps[i - 1]);
      }
      if (intervals.length === 0) return 0;
      return intervals.reduce((a, b) => a + b, 0) / intervals.length;
    };
    const calculatedClickInterval = calculateClickInterval();

    // Return all calculated metrics
    return {
      Mouse_Speed: parseFloat(calculatedMouseSpeed.toFixed(2)),
      Movement_Smoothness: parseFloat(calculatedMovementSmoothness.toFixed(2)),
      Acceleration: parseFloat(calculatedAcceleration.toFixed(2)),
      Direction_Changes: calculatedDirectionChanges,
      Session_Duration: parseFloat(sessionDurationInSeconds.toFixed(2)),
      Total_Session_Time: parseFloat(sessionDurationInSeconds.toFixed(2)),
      Time_to_Submit: parseFloat(sessionDurationInSeconds.toFixed(2)),
      Typing_Speed: parseFloat(calculatedTypingSpeed.toFixed(2)),
      Inter_Key_Interval: parseFloat(calculatedInterKeyInterval.toFixed(2)),
      Keystroke_Duration: parseFloat(calculatedKeystrokeDuration.toFixed(2)),
      Typing_Variability: parseFloat(calculatedTypingVariability.toFixed(2)),
      Rhythmic_Typing_Score: parseFloat(rhythmicTypingScore.toFixed(2)), // New parameter
      Backspace_Count: backspaceCount, // New parameter
      Click_Rate: parseFloat(calculatedClickRate.toFixed(2)),
      Click_Consistency: parseFloat(calculatedClickConsistency.toFixed(2)),
      Click_Interval: parseFloat(calculatedClickInterval.toFixed(2)),
      Sequence_of_Clicks: sequenceOfClicks.length, // Sending as count
      Idle_Time_Between_Actions: parseFloat(calculatedIdleTimeBetweenActions.toFixed(2)),
      Idle_Time_Before_CAPTCHA: 0, // Placeholder, implement logic if CAPTCHA is used
      Total_Idle_Time: parseFloat(calculatedTotalIdleTime.toFixed(2)),
    };
  };

  // Login handler with data submission
  const handleLogin = async () => {
    console.log('Honeypot triggered:', honeypotTriggeredRef.current);
    console.log('Honeypot value:', honeypotValue);

    // Check if honeypot was triggered
    if (honeypotTriggeredRef.current || honeypotValue) {
      setErrorMessage('Bot detected.');
      console.log('Bot detected due to honeypot interaction.');
      return;
    }

    // Calculate metrics
    const metrics = calculateMetrics();

    // Construct the formatted data with the required features
    const formattedData = {
      ...metrics,
      Time_per_Field: timePerField, // This is an object
      // Sequence_of_Clicks is already included as count
    };

    // Debugging: Log formatted data before sending
    console.log('--- Formatted Data to Send ---', formattedData);

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${BACKEND_URL}/api/predict`, formattedData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Server Response:', response.data);

      // Display the prediction to the user
      setPredictionResult(response.data);
    } catch (error) {
      console.error('Error sending interaction data to backend:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(`Error: ${JSON.stringify(error.response.data.error)}`);
      } else {
        setErrorMessage('Failed to send data to the server. Please try again.');
      }
      return;
    }

    // Reset session start time for the next session
    sessionStartRef.current = performance.now();
    // Reset interaction data
    resetInteractionData();
  };

  // Function to reset interaction data after login
  const resetInteractionData = () => {
    setMouseSpeeds([]);
    setMouseAccelerations([]);
    setMovementSmoothnessValues([]);
    directionChangesRef.current = 0;
    setTimePerField({});
    setKeystrokeDurations([]);
    setInterKeyIntervals([]);
    setBackspaceCount(0); // Reset backspace count
    setClickTimestamps([]);
    setSequenceOfClicks([]);
    setIdleTimeBetweenActions([]);
    setTotalIdleTime(0);
    lastKeyDownTimeRef.current = null;
    lastInteractionTimeRef.current = sessionStartRef.current;
    lastCursorPositionRef.current = { x: null, y: null, time: null };
    lastMouseDirectionRef.current = null;
    lastFocusTimeRef.current = null;
    lastFocusFieldRef.current = null;
    honeypotTriggeredRef.current = false;
    setHoneypotValue('');
  };

  // Debug Info Component
  const DebugInfo = () => {
    const metrics = calculateMetrics();
    return (
      <div className="debug-info">
        <h4>Interaction Metrics:</h4>
        <p>Mouse_Speed: {metrics.Mouse_Speed}</p>
        <p>Movement_Smoothness: {metrics.Movement_Smoothness}</p>
        <p>Acceleration: {metrics.Acceleration}</p>
        <p>Direction_Changes: {metrics.Direction_Changes}</p>
        <p>Session_Duration: {metrics.Session_Duration}s</p>
        <p>Total_Session_Time: {metrics.Total_Session_Time}s</p>
        <p>Time_per_Field: {JSON.stringify(timePerField)}</p>
        <p>Time_to_Submit: {metrics.Time_to_Submit}s</p>
        <p>Typing_Speed: {metrics.Typing_Speed} chars/min</p>
        <p>Inter_Key_Interval: {metrics.Inter_Key_Interval} ms</p>
        <p>Keystroke_Duration: {metrics.Keystroke_Duration} ms</p>
        <p>Typing_Variability: {metrics.Typing_Variability}</p>
        <p>Rhythmic_Typing_Score: {metrics.Rhythmic_Typing_Score}</p>
        <p>Backspace_Count: {metrics.Backspace_Count}</p>
        <p>Click_Rate: {metrics.Click_Rate} clicks/sec</p>
        <p>Click_Consistency: {metrics.Click_Consistency}</p>
        <p>Click_Interval: {metrics.Click_Interval} ms</p>
        <p>Sequence_of_Clicks: {metrics.Sequence_of_Clicks}</p>
        <p>Idle_Time_Between_Actions: {metrics.Idle_Time_Between_Actions} ms</p>
        <p>Idle_Time_Before_CAPTCHA: {metrics.Idle_Time_Before_CAPTCHA}s</p>
        <p>Total_Idle_Time: {metrics.Total_Idle_Time}s</p>
        <p>Honeypot Triggered: {honeypotTriggeredRef.current ? 'Yes' : 'No'}</p>
      </div>
    );
  };

  return (
    <div className="portal-container">
      <h2>Login Portal</h2>
      <div className="form-group">
        <label htmlFor="aadhaarNumber">Aadhaar Number:</label>
        <input
          type="text"
          id="aadhaarNumber"
          name="aadhaarNumber"
          value={aadhaarNumber}
          onChange={handleAadhaarChange}
          placeholder="Enter your 12-digit Aadhaar number"
          maxLength={12}
          aria-invalid={!!errorMessage}
          aria-describedby="aadhaarError"
        />
        {errorMessage && <p id="aadhaarError" style={{ color: 'red' }}>{errorMessage}</p>}
      </div>

      {/* Honeypot Field */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0px' }}>
        <label htmlFor="aadhaarNumberHidden">Aadhaar Number:</label>
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

      <button
        id="loginButton"
        onClick={handleLogin}
        disabled={aadhaarNumber.length !== 12}
      >
        Login
      </button>
      {predictionResult && (
        <div className="prediction-result">
          <h3>Prediction: {predictionResult.prediction.toUpperCase()}</h3>
          <p>Probability (bot): {((1 - predictionResult.probability) * 100).toFixed(2)}%</p>
          <p>Probability (human): {(predictionResult.probability * 100).toFixed(2)}%</p>
        </div>
      )}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {process.env.NODE_ENV === 'development' && <DebugInfo />}
      <footer>
        <p>Note: This page collects data for research purposes.</p>
      </footer>
   
    </div>
  );
};

export default Portal;
