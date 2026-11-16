import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';

describe('ICCF Frontend Application & Authentication Interface', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders ICCF branding, authentication view, and quick demo credentials', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ICCF')).toBeInTheDocument();
      expect(screen.getByText('Integrity & Chain-of-Custody Focused')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Preserving Digital Evidence. Protecting Its Integrity. Maintaining the Chain of Custody.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Investigator')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
  });

  it('auto-fills credentials when clicking the Admin demo account button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    const adminButton = screen.getByRole('button', { name: 'Admin' });
    fireEvent.click(adminButton);

    const emailInput = screen.getByPlaceholderText('investigator@iccf.local') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••••••') as HTMLInputElement;

    expect(emailInput.value).toBe('admin@iccf.local');
    expect(passwordInput.value).toBe('ForensicAdmin2026!');
  });

  it('auto-fills credentials when clicking the Investigator demo account button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Investigator')).toBeInTheDocument();
    });

    const invButton = screen.getByRole('button', { name: 'Investigator' });
    fireEvent.click(invButton);

    const emailInput = screen.getByPlaceholderText('investigator@iccf.local') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••••••') as HTMLInputElement;

    expect(emailInput.value).toBe('investigator@iccf.local');
    expect(passwordInput.value).toBe('ForensicAdmin2026!');
  });

  it('auto-fills credentials when clicking the Viewer demo account button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    const viewerButton = screen.getByRole('button', { name: 'Viewer' });
    fireEvent.click(viewerButton);

    const emailInput = screen.getByPlaceholderText('investigator@iccf.local') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••••••') as HTMLInputElement;

    expect(emailInput.value).toBe('viewer@iccf.local');
    expect(passwordInput.value).toBe('ForensicAdmin2026!');
  });

  it('toggles between Sign In and Registration modes with corresponding input fields', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    // Switch to registration mode
    const registerToggleBtn = screen.getByRole('button', { name: 'Create an account' });
    fireEvent.click(registerToggleBtn);

    expect(screen.getByText('Register Investigator')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Special Agent Alex Morgan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ICCF-882')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cyber Forensics')).toBeInTheDocument();

    // Switch back to login mode
    const loginToggleBtn = screen.getByRole('button', { name: 'Already registered? Login' });
    fireEvent.click(loginToggleBtn);

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Special Agent Alex Morgan')).not.toBeInTheDocument();
  });

  it('toggles password input visibility when clicking the eye button', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText('••••••••••••') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // The eye toggle button is inside the password input wrapper
    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find((btn) => btn.querySelector('svg.lucide-eye'));
    expect(eyeButton).toBeDefined();

    if (eyeButton) {
      fireEvent.click(eyeButton);
      expect(passwordInput.type).toBe('text');

      fireEvent.click(eyeButton);
      expect(passwordInput.type).toBe('password');
    }
  });
});
