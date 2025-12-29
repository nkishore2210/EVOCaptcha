import React from 'react';
import '../components/styles.css';

const Header = () => {
    return (
        <header>
          <div className="navbar bg-white">
  <div className="navbar-start">

    <div className="dropdown">
    <img className='gov-logo' src="https://myaadhaar.uidai.gov.in/static/media/uidai_english_logo.37b7e790fc0b23da21bc9df098a66467.svg" alt="" />

 
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
      </ul>
    </div>

  </div>
  <div className="navbar-center hidden lg:flex">
    <ul className="menu menu-horizontal px-1">
      <li className='headertext'>Unique Identification Authority of India
      </li>
      
    </ul>
  </div>
  <div className="navbar-end">
    <img src="https://tathya.uidai.gov.in/access/static/media/aadhaar_english_logo.9a2d63795a7f7bdd7acb2148585336be.svg" alt="" />
  </div>
</div>
        </header>
);
};

export default Header;
