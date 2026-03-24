import React from 'react';
import './Button.css';

/**
 * BASE BUTTON: Component gốc chứa logic và style nền tảng
 */
export const Button = ({ 
    children, 
    onClick, 
    variant = 'primary', // primary, secondary, danger, success, outline
    className = '', 
    icon, 
    disabled = false, 
    type = 'button',
    ...props 
}) => {
    return (
        <button
            type={type}
            className={`z-btn z-btn-${variant} ${className}`}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {icon && <span className="z-btn-icon">{icon}</span>}
            {children && <span className="z-btn-text">{children}</span>}
        </button>
    );
};

// ==========================================
// CÁC NÚT ĐẶC THÙ (DÙNG ĐỂ IMPORT NHANH)
// ==========================================

export const AddButton = ({ children = "Thêm mới", ...props }) => (
    <Button 
        variant="primary" 
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>}
        {...props}
    >
        {children}
    </Button>
);

export const EditButton = ({ children = "Sửa", ...props }) => (
    <Button 
        variant="edit" 
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>}
        {...props}
    >
        {children}
    </Button>
);

export const DeleteButton = ({ children = "Xóa", ...props }) => (
    <Button 
        variant="danger" 
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>}
        {...props}
    >
        {children}
    </Button>
);

export const SaveButton = ({ children = "Lưu thay đổi", ...props }) => (
    <Button 
        variant="success" 
        // icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        {...props}
    >
        {children}
    </Button>
);

export const CancelButton = ({ children = "Hủy bỏ", ...props }) => (
    <Button 
        variant="secondary" 
        // icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>}
        {...props}
    >
        {children}
    </Button>
);

export const CompleteButton = ({ children = "Thêm mới", ...props }) => (
    <Button 
        variant="complete" 
        {...props}
    >
        {children}
    </Button>
);

// Export mặc định là Base Button cho các trường hợp custom khác
export default Button;