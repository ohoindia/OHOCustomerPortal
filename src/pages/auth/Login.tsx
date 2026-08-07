import { useNavigate } from 'react-router-dom';
import { Logo, PrimaryButton } from '../../components/Layout';

export function Login() {
  const navigate = useNavigate();
  return (
    <main className="auth-page">
      <Logo compact />
      <section className="auth-card">
        <h1>Welcome Back!</h1>
        <p>Please login to continue</p>
        <label className="phone-input">
          <span>☎</span>
          <b>+91</b>
          <input placeholder="Enter Mobile Number" defaultValue="9876543210" />
        </label>
        <PrimaryButton onClick={() => navigate('/otp')}>
          Continue
        </PrimaryButton>
        <div className="divider">or</div>
        <button className="social-btn">🌈 Continue with Google</button>
        <button className="social-btn">● Continue with Apple</button>
      </section>
      <p>
        New to OHO? <b>Sign Up</b>
      </p>
    </main>
  );
}
