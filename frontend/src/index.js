// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import Portal from './components/CombinedLogin'; // Ensure App.js exports the Portal component
import Header from './components/header';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Header />
    <Portal />
  </React.StrictMode>
);
// frontend/src/index.js
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import Portal from './app.js'; // Ensure App.js exports the Portal component

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <Portal />
//   </React.StrictMode>
// );


