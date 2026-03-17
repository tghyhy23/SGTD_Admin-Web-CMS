import React, { useEffect } from 'react';
import './Modal.css';
// Sử dụng Destructuring để lấy trực tiếp SaveButton và CancelButton
import { SaveButton, CancelButton } from '../Button/Button'; 

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth = '700px', 
    onSave, // Hàm xử lý khi nhấn "Lưu"
    saveText = "Lưu thay đổi", 
    cancelText = "Hủy bỏ" 
}) => {
    // Nhấn phím ESC để đóng Modal
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    // Nếu isOpen là false thì không render gì cả
    if (!isOpen) return null;

    return (
        <div className="z-modal-overlay" onClick={onClose}>
            {/* e.stopPropagation() ngăn việc click vào khung trắng làm đóng Modal */}
            <div 
                className="z-modal-container" 
                style={{ maxWidth: maxWidth }}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* --- HEADER --- */}
                <div className="z-modal-header">
                    <h3 className="z-modal-title">{title}</h3>
                    <button className="z-modal-close-btn" onClick={onClose} aria-label="Đóng">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                
                {/* --- MAIN CONTENT (OUTLET/CHILDREN) --- */}
                <div className="z-modal-body">
                    {children}
                </div>

                {/* --- FOOTER --- */}
                <div className="z-modal-footer">
                    {/* Sử dụng CancelButton */}
                    <CancelButton onClick={onClose}>
                        {cancelText}
                    </CancelButton>
                    
                    {/* Sử dụng SaveButton */}
                    <SaveButton onClick={onSave}>
                        {saveText}
                    </SaveButton>
                </div>
            </div>
        </div>
    );
};

export default Modal;