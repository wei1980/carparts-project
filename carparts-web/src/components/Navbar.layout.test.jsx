import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock('../context/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
jest.mock('./CurrentVehiclePicker', () => () => <select aria-label="test vehicle" />);
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useLocation: () => ({ pathname: '/' }) }));
it('desktop logo aligns with the page-shell width and responsive gutters', () => {
 render(<Navbar />);
 const logo = screen.getAllByAltText('車大師')[0];
 const row = logo.closest('nav').firstElementChild;
 expect(row).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
 expect(row).not.toHaveClass('max-w-screen-2xl');
 // logo 容器高度：桌面 h-10、lg 以上 h-11
 expect(logo.parentElement).toHaveClass('h-10', 'lg:h-11');
});
