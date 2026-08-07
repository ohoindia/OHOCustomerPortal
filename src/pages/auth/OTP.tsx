import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../../components/Layout';

export function OTP() {
  const navigate = useNavigate();
  const digits = ['2', '4', '7', '8', '1', '6'];
  return (
    <main className="auth-page otp-page">
      <section className="auth-card wide">
        <h1>Verify OTP</h1>
        <p>
          We have sent a 6 digit OTP to
          <br />
          <b>+91 98765 43210</b>
        </p>
        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input key={i} value={d} readOnly />
          ))}
        </div>
        <p>
          Resend OTP in <b>00:25</b>
        </p>
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((n, i) => (
            <button key={i}>{n}</button>
          ))}
        </div>
        <PrimaryButton onClick={() => navigate('/')}>
          Verify & Continue
        </PrimaryButton>
      </section>
    </main>
  );
}
