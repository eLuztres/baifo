/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CredentialsSignInForm from '@/app/(auth)/sign-in/credentials-signin-form';
import SignUpForm from '@/app/(auth)/sign-up/sign-up-form';
import { signInWithCredentials, signUpUser } from '@/lib/actions/user.actions';

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearchParams }));
jest.mock('@/lib/actions/user.actions', () => ({
  signInWithCredentials: jest.fn(),
  signUpUser: jest.fn(),
}));

const mockSignIn = signInWithCredentials as jest.Mock;
const mockSignUp = signUpUser as jest.Mock;

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
});

function submittedData(mock: jest.Mock) {
  const formData = mock.mock.calls[0][1] as FormData;
  return Object.fromEntries(formData.entries());
}

describe('CredentialsSignInForm', () => {
  it('renders required email and password fields', () => {
    render(<CredentialsSignInForm />);

    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/sign-up');
  });

  it('submits the credentials and the callback URL', async () => {
    mockSearchParams = new URLSearchParams('callbackUrl=/cart');
    mockSignIn.mockResolvedValue({ success: true, message: '' });
    render(<CredentialsSignInForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(submittedData(mockSignIn)).toEqual({
      callbackUrl: '/cart',
      email: 'ana@example.com',
      password: 'secret123',
    });
  });

  it('shows the error returned by the server', async () => {
    mockSignIn.mockResolvedValue({ success: false, message: 'Invalid email or password' });
    render(<CredentialsSignInForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});

describe('SignUpForm', () => {
  it('submits all four fields', async () => {
    mockSignUp.mockResolvedValue({ success: true, message: '' });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText('Name'), 'Ana');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalled());
    expect(submittedData(mockSignUp)).toEqual({
      callbackUrl: '/',
      name: 'Ana',
      email: 'ana@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
  });

  it('shows validation messages from the server', async () => {
    mockSignUp.mockResolvedValue({ success: false, message: "Passwords don't match" });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'other123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
  });
});
