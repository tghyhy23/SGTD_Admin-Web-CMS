import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
    // Thêm chức năng: Nhấn phím ESC để đóng Modal
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
        <div className="custom-modal-overlay" onClick={onClose}>
            {/* e.stopPropagation() giúp khi click vào nội dung modal sẽ không bị đóng (chỉ đóng khi click ra ngoài overlay) */}
            <div 
                className="custom-modal-content" 
                style={{ maxWidth: maxWidth }}
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="custom-modal-header">
                    {title && <h3 className="custom-modal-title">{title}</h3>}
                    <button className="custom-modal-close-btn" onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </div>
                
                <div className="custom-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;