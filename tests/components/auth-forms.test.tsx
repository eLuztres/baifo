/** @jest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CredentialsSignInForm from '@/app/(auth)/sign-in/credentials-signin-form';
import SignUpForm from '@/app/(auth)/sign-up/sign-up-form';
import { signInWithCredentials, signUpUser } from '@/lib/actions/user.actions';
import { renderWithI18n, t } from '../utils/render-with-i18n';

jest.mock('@/lib/actions/user.actions', () => ({
  signInWithCredentials: jest.fn(),
  signUpUser: jest.fn(),
}));

const mockSignIn = signInWithCredentials as jest.Mock;
const mockSignUp = signUpUser as jest.Mock;

function submittedData(mock: jest.Mock) {
  const formData = mock.mock.calls[0][1] as FormData;
  return Object.fromEntries(formData.entries());
}

describe('CredentialsSignInForm', () => {
  it('renders required email and password fields', () => {
    renderWithI18n(<CredentialsSignInForm callbackUrl='' canSignUp />);

    expect(screen.getByLabelText(t('FIELD_EMAIL'))).toBeRequired();
    expect(screen.getByLabelText(t('FIELD_PASSWORD'))).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: t('AUTH_SIGN_UP') })).toHaveAttribute('href', '/sign-up');
  });

  it('has no sign-up link when the shop only signs up by invite', () => {
    renderWithI18n(<CredentialsSignInForm callbackUrl='' canSignUp={false} />);

    expect(screen.queryByRole('link', { name: t('AUTH_SIGN_UP') })).not.toBeInTheDocument();
  });

  it('submits the credentials and the callback URL', async () => {
    mockSignIn.mockResolvedValue({ success: true, message: '' });
    renderWithI18n(<CredentialsSignInForm callbackUrl='/cart' canSignUp />);

    await userEvent.type(screen.getByLabelText(t('FIELD_EMAIL')), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(t('FIELD_PASSWORD')), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: t('SIGN_IN') }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(submittedData(mockSignIn)).toEqual({
      callbackUrl: '/cart',
      email: 'ana@example.com',
      password: 'secret123',
    });
  });

  it('shows the error returned by the server', async () => {
    mockSignIn.mockResolvedValue({ success: false, message: 'AUTH_INVALID_CREDENTIALS' });
    renderWithI18n(<CredentialsSignInForm callbackUrl='' canSignUp />);

    await userEvent.type(screen.getByLabelText(t('FIELD_EMAIL')), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(t('FIELD_PASSWORD')), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: t('SIGN_IN') }));

    expect(await screen.findByText(t('AUTH_INVALID_CREDENTIALS'))).toBeInTheDocument();
  });
});

describe('SignUpForm', () => {
  it('submits all four fields', async () => {
    mockSignUp.mockResolvedValue({ success: true, message: '' });
    renderWithI18n(<SignUpForm callbackUrl='/' />);

    await userEvent.type(screen.getByLabelText(t('FIELD_NAME')), 'Ana');
    await userEvent.type(screen.getByLabelText(t('FIELD_EMAIL')), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(t('FIELD_PASSWORD')), 'secret123');
    await userEvent.type(screen.getByLabelText(t('FIELD_CONFIRM_PASSWORD')), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: t('AUTH_SIGN_UP') }));

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
    mockSignUp.mockResolvedValue({ success: false, message: 'VALIDATION_PASSWORDS_MISMATCH' });
    renderWithI18n(<SignUpForm callbackUrl='' />);

    await userEvent.type(screen.getByLabelText(t('FIELD_PASSWORD')), 'secret123');
    await userEvent.type(screen.getByLabelText(t('FIELD_CONFIRM_PASSWORD')), 'other123');
    await userEvent.click(screen.getByRole('button', { name: t('AUTH_SIGN_UP') }));

    expect(await screen.findByText(t('VALIDATION_PASSWORDS_MISMATCH'))).toBeInTheDocument();
  });
});
