import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../utils/firebase";
import { useHabitBlockchain } from "../context/HabitBlockchainContext";

function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { activateTherapistOnChain } = useHabitBlockchain();

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  // Update the localStorage with the complete user object
  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...userData
        };
        
        updateUser(user);
        toast.success("Login successful!");
      
        // If user has therapist name, activate on blockchain
        if (user.therapistName && user.therapistName.trim()) {
          try {
            await activateTherapistOnChain();
            toast.success("Therapist status activated on-chain");
          } catch (err) {
            console.error("Error activating therapist on blockchain:", err);
            toast.warn("Logged in, but failed to activate therapist status on-chain");
          }
        }
        
        navigate("/");
      } else {
        setError("User data not found. Please contact support.");
        toast.error("User data not found");
      }
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Login failed. Please try again.";
      
      // Handle specific Firebase Auth errors
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <BackgroundEffects>
        <FloatingOrb className="orb-1" />
        <FloatingOrb className="orb-2" />
        <FloatingOrb className="orb-3" />
      </BackgroundEffects>
      
      <ContentWrapper>
        <FormCard>
          <LogoSection>
            <LogoIcon>✦</LogoIcon>
            <BrandName>TriFocus</BrandName>
            <Subtitle>Welcome back</Subtitle>
          </LogoSection>

          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <InputWrapper>
                <EmailIcon>📧</EmailIcon>
                <StyledInput
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={values.email}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>
            </InputGroup>
            
            <InputGroup>
              <InputWrapper>
                <LockIcon>🔒</LockIcon>
                <StyledInput
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={values.password}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>
            </InputGroup>
            
            <LoginButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowIcon>→</ArrowIcon>
                </>
              )}
            </LoginButton>
          </Form>
          
          <Divider>
            <DividerLine />
            <DividerText>or</DividerText>
            <DividerLine />
          </Divider>
          
          <SignupSection>
            <SignupText>New to TriFocus?</SignupText>
            <SignupLink to="/register">Create an account</SignupLink>
          </SignupSection>
        </FormCard>
        
        <WelcomeSection>
          <WelcomeContent>
            <WelcomeTitle>
              Unlock Your
              <GradientText> Potential</GradientText>
            </WelcomeTitle>
            <WelcomeDescription>
              Transform your productivity with intelligent focus management and seamless time tracking
            </WelcomeDescription>
            <FeatureList>
              <Feature>
                <FeatureIcon>⚡</FeatureIcon>
                <FeatureText>Smart Focus Sessions</FeatureText>
              </Feature>
              <Feature>
                <FeatureIcon>📊</FeatureIcon>
                <FeatureText>Analytics Dashboard</FeatureText>
              </Feature>
              <Feature>
                <FeatureIcon>🎯</FeatureIcon>
                <FeatureText>Goal Tracking</FeatureText>
              </Feature>
            </FeatureList>
          </WelcomeContent>
        </WelcomeSection>
      </ContentWrapper>
    </Container>
  );
}

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1b4b 0%, #581c87 50%, #be185d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: relative;
  overflow: hidden;
`;

const BackgroundEffects = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const FloatingOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3));
  animation: ${float} 6s ease-in-out infinite, ${pulse} 4s ease-in-out infinite;
  
  &.orb-1 {
    width: 200px;
    height: 200px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }
  
  &.orb-2 {
    width: 150px;
    height: 150px;
    top: 60%;
    right: 15%;
    animation-delay: 2s;
  }
  
  &.orb-3 {
    width: 100px;
    height: 100px;
    bottom: 20%;
    left: 20%;
    animation-delay: 4s;
  }
`;

const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  max-width: 1200px;
  width: 100%;
  align-items: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`;

const FormCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  animation: ${slideIn} 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 768px) {
    padding: 2rem;
    margin: 1rem;
  }
`;

const LogoSection = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const LogoIcon = styled.div`
  font-size: 3rem;
  color: #f8fafc;
  margin-bottom: 1rem;
  display: inline-block;
  background: linear-gradient(45deg, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BrandName = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
  margin-bottom: 0.5rem;
  background: linear-gradient(45deg, #f8fafc, #e2e8f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: rgba(248, 250, 252, 0.7);
  font-size: 1.1rem;
  margin: 0;
`;

const Form = styled.form`
  width: 100%;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const EmailIcon = styled.span`
  position: absolute;
  left: 1rem;
  font-size: 1.2rem;
  z-index: 1;
  color: rgba(248, 250, 252, 0.6);
`;

const LockIcon = styled.span`
  position: absolute;
  left: 1rem;
  font-size: 1.2rem;
  z-index: 1;
  color: rgba(248, 250, 252, 0.6);
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #f8fafc;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(248, 250, 252, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    transform: translateY(-2px);
  }
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: linear-gradient(45deg, #8b5cf6, #ec4899);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  
  &:hover {
    background: linear-gradient(45deg, #7c3aed, #db2777);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ArrowIcon = styled.span`
  font-size: 1.2rem;
  transition: transform 0.3s ease;
  
  ${LoginButton}:hover & {
    transform: translateX(4px);
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const ErrorMessage = styled.div`
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  text-align: center;
  backdrop-filter: blur(10px);
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 2rem 0;
`;

const DividerLine = styled.div`
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
`;

const DividerText = styled.span`
  color: rgba(248, 250, 252, 0.6);
  padding: 0 1rem;
  font-size: 0.9rem;
`;

const SignupSection = styled.div`
  text-align: center;
`;

const SignupText = styled.p`
  color: rgba(248, 250, 252, 0.7);
  margin: 0 0 0.5rem 0;
`;

const SignupLink = styled(Link)`
  color: #8b5cf6;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
  
  &:hover {
    color: #a855f7;
    text-decoration: underline;
  }
`;

const WelcomeSection = styled.div`
  animation: ${slideInRight} 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 968px) {
    order: -1;
  }
`;

const WelcomeContent = styled.div`
  color: white;
  max-width: 500px;
`;

const WelcomeTitle = styled.h2`
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const GradientText = styled.span`
  background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeDescription = styled.p`
  font-size: 1.2rem;
  color: rgba(248, 250, 252, 0.8);
  line-height: 1.6;
  margin-bottom: 2.5rem;
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const FeatureIcon = styled.span`
  font-size: 1.5rem;
  min-width: 2rem;
`;

const FeatureText = styled.span`
  font-weight: 500;
  color: rgba(248, 250, 252, 0.9);
`;

export default Login;