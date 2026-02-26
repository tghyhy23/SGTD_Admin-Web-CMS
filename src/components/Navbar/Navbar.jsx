// src/components/Navbar/Navbar.jsx
import './Navbar.css';
import logo from '../../assets/images/logo_sgtd.png';
import search from '../../assets/icons/search_icon.png';
import question from '../../assets/icons/question_icon.png';
import bell from '../../assets/icons/bell_icon.png';
const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="Logo" className="sidebar-logo-img" />
      </div>
      <div className="navbar-right">
        <div className="nav-item">
          <img src={search} alt="Search" className="nav-icon" />
        </div>
        <div className="nav-item">
          <img src={question} alt="Question" className="nav-icon" />
        </div>
        <div className="nav-item">
          <img src={bell} alt="Bell" className="nav-icon" />
        </div>
        <div className="nav-item user-profile">
          <img src="https://i.pravatar.cc/150?img=11" alt="avatar" className="avatar" />
          <span className='user-name'>Serati Ma</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;