import axios from "axios";
import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useHabitBlockchain } from "../context/HabitBlockchainContext";
import { auth, db } from "../utils/firebase"; // Import Firebase auth and firestore
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// Move all styled components outside the main component
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

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
    width: 180px;
    height: 180px;
    top: 5%;
    left: 5%;
    animation-delay: 0s;
  }
  
  &.orb-2 {
    width: 120px;
    height: 120px;
    top: 20%;
    right: 10%;
    animation-delay: 2s;
  }
  
  &.orb-3 {
    width: 200px;
    height: 200px;
    bottom: 10%;
    left: 15%;
    animation-delay: 4s;
  }
  
  &.orb-4 {
    width: 140px;
    height: 140px;
    bottom: 30%;
    right: 5%;
    animation-delay: 6s;
  }
`;

const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  max-width: 1400px;
  width: 100%;
  align-items: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
`;

const WelcomeSection = styled.div`
  animation: ${slideIn} 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 1024px) {
    order: 1;
  }
`;

const WelcomeContent = styled.div`
  color: white;
  max-width: 600px;
`;

const WelcomeTitle = styled.h1`
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 2.8rem;
  }
`;

const GradientText = styled.span`
  background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeDescription = styled.p`
  font-size: 1.3rem;
  color: rgba(248, 250, 252, 0.8);
  line-height: 1.6;
  margin-bottom: 3rem;
`;

const BenefitsList = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Benefit = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${fadeInUp} 0.6s ease-out;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  &:nth-child(4) { animation-delay: 0.4s; }
`;

const BenefitIcon = styled.span`
  font-size: 2rem;
  min-width: 3rem;
`;

const BenefitText = styled.span`
  font-weight: 600;
  color: rgba(248, 250, 252, 0.9);
  font-size: 1.1rem;
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
  animation: ${slideInRight} 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (max-width: 1024px) {
    order: 2;
  }
  
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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const Step = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s ease;

  ${({ $completed, $active }) => $completed ? `
    background: linear-gradient(45deg, #10b981, #059669);
    color: white;
  ` : $active ? `
    background: linear-gradient(45deg, #8b5cf6, #ec4899);
    color: white;
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(248, 250, 252, 0.6);
  `}
`;

const StepLine = styled.div`
  width: 60px;
  height: 2px;
  margin: 0 10px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(90deg, #10b981, #059669)'
      : 'rgba(255, 255, 255, 0.2)'};
  transition: all 0.3s ease;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const BlockchainForm = styled.div`
  width: 100%;
`;

const BlockchainHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const BlockchainIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const BlockchainTitle = styled.h3`
  color: #f8fafc;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;

const BlockchainDescription = styled.p`
  color: rgba(248, 250, 252, 0.7);
  font-size: 1rem;
  margin: 0;
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const StyledCheckbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: #8b5cf6;
`;

const CheckboxLabel = styled.label`
  color: #f8fafc;
  font-weight: 500;
`;

const BlockchainOptions = styled.div`
  animation: ${fadeInUp} 0.5s ease-out;
`;

const WalletSection = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const WalletButton = styled.button`
  padding: 1rem 2rem;
  background: linear-gradient(45deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
  
  &:hover:not(:disabled) {
    background: linear-gradient(45deg, #4f46e5, #7c3aed);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const WalletInfo = styled.p`
  color: rgba(248, 250, 252, 0.7);
  font-size: 0.9rem;
  margin: 0;
`;

const ConnectedWallet = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #10b981;
  font-weight: 600;
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
`;

const WalletIcon = styled.span`
  font-size: 1.2rem;
`;

const BlockchainBenefits = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const BenefitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(248, 250, 252, 0.8);
  font-size: 0.9rem;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  margin-top: 2rem;
`;

const BackButton = styled.button`
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-direction: row;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const InputGroup = styled.div`
  width: 100%;
  margin-bottom: 1rem;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1rem;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

const IconBase = styled.span`
  position: absolute;
  left: 1rem;
  font-size: 1.2rem;
  color: rgba(248, 250, 252, 0.6);
  pointer-events: none;
  z-index: 2;
`;

const UserIcon = styled(IconBase)``;
const EmailIcon = styled(IconBase)``;
const LockIcon = styled(IconBase)``;
const CheckIcon = styled(IconBase)``;
const RoleIcon = styled(IconBase)``;
const TokenIcon = styled(IconBase)``;
const TherapistIcon = styled(IconBase)``;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #f8fafc;
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: rgba(248, 250, 252, 0.6);
  }

  &:focus {
    outline: none;
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1rem;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: transparent;
  color: #f8fafc;
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  outline: none;
  appearance: none;
  cursor: pointer;

  option {
    color: #111827;
    background-color: #f9fafb;
  }

  &:focus {
    outline: none;
  }
`;

const RegisterButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  background: linear-gradient(45deg, #8b5cf6, #ec4899);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(45deg, #7c3aed, #db2777);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);

    &::before {
      left: 100%;
    }
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const ArrowIcon = styled.span`
  font-size: 1.2rem;
  transition: transform 0.3s ease;

  ${RegisterButton}:hover & {
    transform: translateX(4px);
  }
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
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
  font-size: 0.9rem;
  margin: 0 1rem;
`;

const LoginSection = styled.div`
  text-align: center;
  margin-top: 1rem;
`;

const LoginText = styled.span`
  color: rgba(248, 250, 252, 0.7);
  font-size: 0.95rem;
`;

const LoginLink = styled(Link)`
  color: #8b5cf6;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.5rem;
  transition: color 0.3s ease;

  &:hover {
    color: #a855f7;
    text-decoration: underline;
  }
`;

const InputHint = styled.div`
  color: rgba(248, 250, 252, 0.6);
  font-size: 0.8rem;
  margin-top: 0.5rem;
  margin-left: 0.5rem;
`;

// Main Register Component
// Main Register Component
export default function Register() {
   const navigate = useNavigate();
  const {
    isConnected,
    connectWallet,
    stakeTokens,
    registerTherapist,
    isLoading: blockchainLoading,
    error: blockchainError
  } = useHabitBlockchain();

  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [blockchainValues, setBlockchainValues] = useState({
    stakeAmount: "",
    therapistName: "",
    enableBlockchain: false
  });
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Use useCallback to prevent function recreation on every render
  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues(prevValues => ({
      ...prevValues,
      [name]: value
    }));
  }, []);

  const handleBlockchainChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setBlockchainValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (values.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(values.email)) {
      setError("Please provide a valid email address");
      return false;
    }

    if (values.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }

    return true;
  }, [values]);

  const validateBlockchainForm = useCallback(() => {
    if (blockchainValues.enableBlockchain) {
      if (!isConnected) {
        setError("Please connect your wallet first");
        return false;
      }

      if (blockchainValues.stakeAmount && (parseFloat(blockchainValues.stakeAmount) < 0.01 || parseFloat(blockchainValues.stakeAmount) > 1000000)) {
        setError("Stake amount must be between 0.01 and 1,000,000 tokens");
        return false;
      }

      if (blockchainValues.therapistName.trim() && blockchainValues.therapistName.length > 100) {
        setError("Therapist name must be less than 100 characters");
        return false;
      }
    }

    return true;
  }, [blockchainValues, isConnected]);

  const handleBasicInfoSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setCurrentStep(2);
  }, [validateForm]);

  const completeRegistration = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        values.email, 
        values.password
      );
      
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: values.username
      });

      // Create user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        username: values.username,
        email: values.email,
        blockchainEnabled: blockchainValues.enableBlockchain,
        initialStake: blockchainValues.stakeAmount || "0",
        therapistName: blockchainValues.therapistName || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Additional user fields
        isTherapist: !!blockchainValues.therapistName.trim(),
        profileCompleted: true,
        preferences: {
          notifications: true,
          darkMode: false,
          language: "en"
        },
        stats: {
          totalHabits: 0,
          completedHabits: 0,
          currentStreak: 0,
          longestStreak: 0
        }
      });

      toast.success("Registration successful! Please login.");
      navigate("/login");
      
    } catch (err) {
      console.error("Registration error:", err);
      let errorMessage = "Registration failed. Please try again.";
      
      // Handle specific Firebase Auth errors
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Email is already registered. Please use a different email.";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak. Please choose a stronger password.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please provide a valid email address.";
          break;
        case 'auth/operation-not-allowed':
          errorMessage = "Email/password registration is not enabled.";
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [values, blockchainValues, navigate]);

  const handleBlockchainSetup = useCallback(async () => {
    if (!blockchainValues.enableBlockchain) {
      await completeRegistration();
      return;
    }

    if (!validateBlockchainForm()) {
      return;
    }

    setIsLoading(true);
    try {
      if (blockchainValues.stakeAmount && parseFloat(blockchainValues.stakeAmount) > 0) {
        toast.info("Processing token staking...");
        const stakeTxHash = await stakeTokens(parseFloat(blockchainValues.stakeAmount));
        toast.success(`Tokens staked successfully! Transaction: ${stakeTxHash.slice(0, 10)}...`);
      }

      if (blockchainValues.therapistName.trim()) {
        toast.info("Registering as therapist on blockchain...");
        const therapistTxHash = await registerTherapist(blockchainValues.therapistName.trim());
        toast.success(`Therapist registered successfully! Transaction: ${therapistTxHash.slice(0, 10)}...`);
      
        // Clear cache so RedeemStore fetches new data
        localStorage.removeItem("therapistAddresses");
      }
      
      await completeRegistration();
    } catch (err) {
      console.error("Blockchain setup error:", err);
      setError(err.message || "Blockchain setup failed. Please try again.");
      toast.error(err.message || "Blockchain setup failed");
    } finally {
      setIsLoading(false);
    }
  }, [blockchainValues, validateBlockchainForm, completeRegistration, stakeTokens, registerTherapist]);

  const handleWalletConnect = useCallback(async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected successfully!");
    } catch (err) {
      toast.error("Failed to connect wallet");
    }
  }, [connectWallet]);

  const goBackToBasicInfo = useCallback(() => {
    setCurrentStep(1);
    setError("");
  }, []);

  return (
    <Container>
      <BackgroundEffects>
        <FloatingOrb className="orb-1" />
        <FloatingOrb className="orb-2" />
        <FloatingOrb className="orb-3" />
        <FloatingOrb className="orb-4" />
      </BackgroundEffects>
      
      <ContentWrapper>
        <WelcomeSection>
          <WelcomeContent>
            <WelcomeTitle>
              Start Your
              <GradientText> Journey</GradientText>
            </WelcomeTitle>
            <WelcomeDescription>
              Join thousands of users who have transformed their productivity and well-being with MindMesh
            </WelcomeDescription>
            <BenefitsList>
              <Benefit>
                <BenefitIcon>🚀</BenefitIcon>
                <BenefitText>Boost Productivity by 300%</BenefitText>
              </Benefit>
              <Benefit>
                <BenefitIcon>🧠</BenefitIcon>
                <BenefitText>Improve Mental Clarity</BenefitText>
              </Benefit>
              <Benefit>
                <BenefitIcon>⏰</BenefitIcon>
                <BenefitText>Master Time Management</BenefitText>
              </Benefit>
              <Benefit>
                <BenefitIcon>🎯</BenefitIcon>
                <BenefitText>Achieve Your Goals</BenefitText>
              </Benefit>
            </BenefitsList>
          </WelcomeContent>
        </WelcomeSection>
        
        <FormCard>
          <LogoSection>
            <LogoIcon>✦</LogoIcon>
            <BrandName>MindMesh</BrandName>
            <Subtitle>
              {currentStep === 1 ? "Create your account" : "Blockchain Setup (Optional)"}
            </Subtitle>
          </LogoSection>

          <StepIndicator>
            <Step $active={currentStep === 1} $completed={currentStep > 1}>1</Step>
            <StepLine $active={currentStep > 1} />
            <Step $active={currentStep === 2}>2</Step>
          </StepIndicator>

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {blockchainError && <ErrorMessage>{blockchainError}</ErrorMessage>}
          
          {currentStep === 1 ? (
            <Form onSubmit={handleBasicInfoSubmit}>
              <InputWrapper>
                <UserIcon>👤</UserIcon>
                <StyledInput
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={values.username}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>
              <InputHint>Minimum 3 characters</InputHint>

              <InputWrapper>
                <EmailIcon>📧</EmailIcon>
                <StyledInput
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={values.email}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>

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
              <InputHint>Minimum 8 characters</InputHint>

              <InputWrapper>
                <CheckIcon>✓</CheckIcon>
                <StyledInput
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </InputWrapper>

              <RegisterButton type="submit" disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    Continue
                    <ArrowIcon>→</ArrowIcon>
                  </>
                )}
              </RegisterButton>
            </Form>
          ) : (
            <BlockchainForm>
              <BlockchainHeader>
                <BlockchainIcon>⛓️</BlockchainIcon>
                <BlockchainTitle>Blockchain Features</BlockchainTitle>
                <BlockchainDescription>
                  Enable blockchain features for enhanced security and rewards
                </BlockchainDescription>
              </BlockchainHeader>

              <CheckboxWrapper>
                <StyledCheckbox
                  type="checkbox"
                  name="enableBlockchain"
                  checked={blockchainValues.enableBlockchain}
                  onChange={handleBlockchainChange}
                />
                <CheckboxLabel>Enable Blockchain Features</CheckboxLabel>
              </CheckboxWrapper>

              {blockchainValues.enableBlockchain && (
                <BlockchainOptions>
                  <BlockchainBenefits>
                    <BenefitItem>
                      <span>🔐</span>
                      <span>Secure habit tracking with immutable records</span>
                    </BenefitItem>
                    <BenefitItem>
                      <span>🪙</span>
                      <span>Earn tokens for completing habits</span>
                    </BenefitItem>
                    <BenefitItem>
                      <span>🏆</span>
                      <span>Stake tokens to boost your commitment</span>
                    </BenefitItem>
                    <BenefitItem>
                      <span>👥</span>
                      <span>Join a decentralized community</span>
                    </BenefitItem>
                  </BlockchainBenefits>

                  {!isConnected ? (
                    <WalletSection>
                      <WalletButton 
                        onClick={handleWalletConnect}
                        disabled={blockchainLoading}
                      >
                        {blockchainLoading ? <LoadingSpinner /> : 'Connect Wallet'}
                      </WalletButton>
                      <WalletInfo>Connect your MetaMask wallet to continue</WalletInfo>
                    </WalletSection>
                  ) : (
                    <ConnectedWallet>
                      <WalletIcon>✅</WalletIcon>
                      <span>Wallet Connected</span>
                    </ConnectedWallet>
                  )}

                  {isConnected && (
                    <>
                      <InputWrapper>
                        <TokenIcon>🪙</TokenIcon>
                        <StyledInput
                          type="number"
                          name="stakeAmount"
                          placeholder="Initial stake amount (optional)"
                          value={blockchainValues.stakeAmount}
                          onChange={handleBlockchainChange}
                          min="0"
                          step="0.01"
                        />
                      </InputWrapper>
                      <InputHint>Stake tokens to boost your habit commitment (0.01 - 1,000,000)</InputHint>

                      <InputWrapper>
                        <TherapistIcon>👨‍⚕️</TherapistIcon>
                        <StyledInput
                          type="text"
                          name="therapistName"
                          placeholder="Professional name (optional - for therapist services)"
                          value={blockchainValues.therapistName}
                          onChange={handleBlockchainChange}
                          maxLength="100"
                        />
                      </InputWrapper>
                      <InputHint>Register as a therapist on blockchain to offer services (optional)</InputHint>
                    </>
                  )}
                </BlockchainOptions>
              )}

              <ButtonRow>
                <BackButton onClick={goBackToBasicInfo} disabled={isLoading}>
                  ← Back
                </BackButton>
                <RegisterButton 
                  onClick={handleBlockchainSetup} 
                  disabled={isLoading || (blockchainValues.enableBlockchain && !isConnected)}
                >
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      Complete Registration
                      <ArrowIcon>🚀</ArrowIcon>
                    </>
                  )}
                </RegisterButton>
              </ButtonRow>
            </BlockchainForm>
          )}

          <Divider>
            <DividerLine />
            <DividerText>or</DividerText>
            <DividerLine />
          </Divider>

          <LoginSection>
            <LoginText>Already have an account?</LoginText>
            <LoginLink to="/login">Sign in here</LoginLink>
          </LoginSection>
        </FormCard>
      </ContentWrapper>
    </Container>
  );
}