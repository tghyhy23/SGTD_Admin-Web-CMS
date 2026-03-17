import React, { useState, useRef, useEffect } from 'react';
import './Select.css';

export const Select = ({ 
    name, 
    options = [], 
    value, 
    onChange, 
    placeholder = "Vui lòng chọn...", 
    disabled = false 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Xử lý click ra ngoài để đóng dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Tìm label của option đang được chọn
    const selectedOption = options.find(opt => opt.value === value);

    // Giả lập event.target để tương thích với handleInputChange của bạn
    const handleOptionClick = (optionValue) => {
        if (onChange) {
            onChange({ target: { name, value: optionValue } });
        }
        setIsOpen(false);
    };

    return (
        <div className={`z-custom-select ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
            <div 
                className={`z-select-trigger ${isOpen ? 'open' : ''}`} 
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className="z-select-value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                
                {/* Icon mũi tên */}
                <svg className={`z-select-arrow ${isOpen ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                    <path d="M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z"/>
                </svg>
            </div>
            
            {isOpen && (
                <div className="z-select-dropdown-menu">
                    {options.map((opt) => (
                        <div 
                            key={opt.value} 
                            className={`z-select-dropdown-item ${value === opt.value ? 'active' : ''}`}
                            onClick={() => handleOptionClick(opt.value)}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Select;