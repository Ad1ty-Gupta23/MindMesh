import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import HabitStakingABI from '../abi/HabitStaking.json';

// Contract configuration
const CONTRACT_CONFIG = {
  address: "0x4bEae51760C01A2C2a55BF1FBA9265E2f661c71a",
  chainId: 17000, // Holesky testnet
  network: "holesky",
  constants: {
    maxStakeAmount: "1000", // 1M tokens
    minSessionFee: "1", // 10 tokens
    maxHabitReward: "10" // 100 tokens
  }
};

// Pinata configuration
const PINATA_CONFIG = {
  JWT: import.meta.env.VITE_PINATA_JWT?.trim() || 'your_pinata_jwt_here',
  GATEWAY_URL: import.meta.env.VITE_PINATA_GATEWAY?.trim() || 'https://your-gateway.pinata.cloud'
};

// Updated booking status enum - always show as Confirmed for report uploads
const BOOKING_STATUS = {
  0: 'Confirmed', // Changed from 'Pending' to 'Confirmed'
  1: 'Completed',
  2: 'Cancelled'
};

// IPFS Service Class
class IPFSService {
  constructor() {
    this.pinataJWT = PINATA_CONFIG.JWT;
    this.gatewayUrl = PINATA_CONFIG.GATEWAY_URL;
  }

  /**
   * Encrypt file content using patient's address as encryption key
   */
  encryptContent(content, patientAddress) {
    try {
      const encryptionKey = CryptoJS.SHA256(patientAddress + 'therapy_report_salt').toString();
      const encrypted = CryptoJS.AES.encrypt(content, encryptionKey).toString();
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file content using patient's address
   */
  decryptContent(encryptedContent, patientAddress) {
    try {
      const encryptionKey = CryptoJS.SHA256(patientAddress + 'therapy_report_salt').toString();
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to IPFS via Pinata
   */
  async uploadJSON(data, metadata = {}) {
    try {
      const pinataContent = {
        pinataContent: data,
        pinataMetadata: {
          name: metadata.name || 'therapy_report_data',
          keyvalues: {
            type: 'therapy_report_json',
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        body: JSON.stringify(pinataContent)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata JSON upload failed: ${errorData.error?.details || response.statusText}`);
      }

      const result = await response.json();
      return {
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        isDuplicate: result.isDuplicate || false
      };
    } catch (error) {
      throw new Error(`IPFS JSON upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve JSON data from IPFS
   */
  async retrieveJSON(ipfsHash) {
    try {
      const url = `${this.gatewayUrl}/ipfs/${ipfsHash}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to retrieve JSON: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`IPFS JSON retrieval failed: ${error.message}`);
    }
  }

  /**
   * Complete therapy report upload flow
   */
  async uploadTherapyReport(reportContent, patientAddress, additionalMetadata = {}) {
    try {
      // Step 1: Encrypt the report content
      const encryptedContent = this.encryptContent(reportContent, patientAddress);

      // Step 2: Create report data structure
      const reportData = {
        encryptedContent,
        patientAddress,
        therapistAddress: additionalMetadata.therapistAddress,
        sessionId: additionalMetadata.sessionId,
        createdAt: new Date().toISOString(),
        reportType: 'therapy_session',
        version: '1.0'
      };

      // Step 3: Upload encrypted report to IPFS
      const uploadResult = await this.uploadJSON(reportData, {
        name: `therapy_report_${additionalMetadata.sessionId || Date.now()}`,
        patientAddress,
        therapistAddress: additionalMetadata.therapistAddress,
        sessionId: additionalMetadata.sessionId
      });

      return {
        success: true,
        ipfsHash: uploadResult.ipfsHash,
        encryptedContent,
        uploadResult,
        retrievalUrl: `${this.gatewayUrl}/ipfs/${uploadResult.ipfsHash}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve and decrypt therapy report
   */
  async retrieveTherapyReport(ipfsHash, patientAddress) {
    try {
      // Step 1: Retrieve encrypted report from IPFS
      const reportData = await this.retrieveJSON(ipfsHash);

      // Step 2: Verify patient address matches
      if (reportData.patientAddress.toLowerCase() !== patientAddress.toLowerCase()) {
        throw new Error('Unauthorized: Patient address mismatch');
      }

      // Step 3: Decrypt the content
      const decryptedContent = this.decryptContent(reportData.encryptedContent, patientAddress);

      return {
        success: true,
        reportContent: decryptedContent,
        metadata: {
          therapistAddress: reportData.therapistAddress,
          sessionId: reportData.sessionId,
          createdAt: reportData.createdAt,
          reportType: reportData.reportType
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Pinata service is configured properly
   */
  async checkConfiguration() {
    try {
      const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Pinata configuration check failed:', error);
      return false;
    }
  }
}

const HabitBlockchainContext = createContext();

export const useHabitBlockchain = () => {
  const context = useContext(HabitBlockchainContext);
  if (!context) {
    throw new Error('useHabitBlockchain must be used within a HabitBlockchainProvider');
  }
  return context;
};

export const HabitBlockchainProvider = ({ children }) => {
  // State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // IPFS Service instance
  const [ipfsService] = useState(() => new IPFSService());
  const [ipfsStatus, setIpfsStatus] = useState({ isConfigured: false, isChecking: false });
  
  // User data - Store both raw and formatted values
  const [userData, setUserData] = useState({
    stakedTokens: '0',
    earnedTokens: '0',
    habitStreak: 0,
    isActive: false,
    stakedTokensFormatted: '0',
    earnedTokensFormatted: '0'
  });
  
  // Therapist data
  const [therapistData, setTherapistData] = useState({
    name: '',
    sessionCount: 0,
    isActive: false,
    totalEarnings: '0',
    totalEarningsFormatted: '0'
  });
  
  // Bookings
  const [userBookings, setUserBookings] = useState([]);
  const [therapistBookings, setTherapistBookings] = useState([]);
  
  // Contract stats
  const [contractStats, setContractStats] = useState({
    totalStaked: '0',
    totalRewards: '0',
    totalBookings: 0,
    totalStakedFormatted: '0',
    totalRewardsFormatted: '0'
  });

  // Check IPFS configuration on mount
  useEffect(() => {
    const checkIpfsConfig = async () => {
      setIpfsStatus(prev => ({ ...prev, isChecking: true }));
      try {
        const isConfigured = await ipfsService.checkConfiguration();
        setIpfsStatus({ isConfigured, isChecking: false });
      } catch (error) {
        console.error('IPFS configuration check failed:', error);
        setIpfsStatus({ isConfigured: false, isChecking: false });
      }
    };

    checkIpfsConfig();
  }, [ipfsService]);

  // Initialize provider and contract
  const initializeContract = useCallback(async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        
        const network = await web3Provider.getNetwork();
        if (Number(network.chainId) !== CONTRACT_CONFIG.chainId) {
          throw new Error(`Please switch to Holesky testnet (Chain ID: ${CONTRACT_CONFIG.chainId})`);
        }
        
        const web3Signer = await web3Provider.getSigner();
        setSigner(web3Signer);
        
        // Handle different ABI formats
        let abiArray;
        if (Array.isArray(HabitStakingABI)) {
          abiArray = HabitStakingABI;
        } else if (HabitStakingABI.abi && Array.isArray(HabitStakingABI.abi)) {
          abiArray = HabitStakingABI.abi;
        } else if (typeof HabitStakingABI === 'object' && HabitStakingABI.default) {
          abiArray = Array.isArray(HabitStakingABI.default) ? HabitStakingABI.default : HabitStakingABI.default.abi;
        } else {
          throw new Error('Invalid ABI format. Expected an array or object with abi property.');
        }

        const habitContract = new ethers.Contract(
          CONTRACT_CONFIG.address,
          abiArray,
          web3Signer
        );
        setContract(habitContract);
        
        const address = await web3Signer.getAddress();
        setAccount(address);
        setIsConnected(true);
        
        // Load initial data
        await loadUserData(habitContract, address);
        await loadContractStats(habitContract);
        
        setError(null);
      } else {
        throw new Error('MetaMask not detected. Please install MetaMask.');
      }
    } catch (err) {
      setError(err.message);
      console.error('Contract initialization error:', err);
    }
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await initializeContract();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data
  const loadUserData = async (contractInstance = contract, userAddress = account) => {
    if (!contractInstance || !userAddress) return;
    
    try {
      const [staked, earned, streak, active] = await contractInstance.getUserData(userAddress);
      
      const stakedFormatted = formatTokenAmount(staked.toString());
      const earnedFormatted = formatTokenAmount(earned.toString());
      
      setUserData({
        stakedTokens: staked.toString(),
        earnedTokens: earned.toString(),
        habitStreak: Number(streak),
        isActive: active,
        stakedTokensFormatted: stakedFormatted,
        earnedTokensFormatted: earnedFormatted
      });
      
      // Check if user is a therapist
      const [name, sessions, therapistActive] = await contractInstance.getTherapistData(userAddress);
      const rawTherapist = await contractInstance.therapists(userAddress);
      
      const totalEarningsFormatted = formatTokenAmount(rawTherapist.totalEarnings.toString());
      
      setTherapistData({
        name,
        sessionCount: Number(sessions),
        isActive: therapistActive,
        totalEarnings: rawTherapist.totalEarnings.toString(),
        totalEarningsFormatted
      });
      
      // Load bookings with auto-confirmation logic
      const userBookingsData = await contractInstance.getUserBookings(userAddress);
      setUserBookings(userBookingsData.map(formatBookingWithAutoConfirm));
      
      if (therapistActive) {
        const therapistBookingsData = await contractInstance.getTherapistBookings(userAddress);
        setTherapistBookings(therapistBookingsData.map(formatBookingWithAutoConfirm));
      }
      
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  // Load contract stats
  const loadContractStats = async (contractInstance = contract) => {
    if (!contractInstance) return;
    
    try {
      const [totalStaked, totalRewards, totalBookings] = await contractInstance.getContractStats();
      
      const totalStakedFormatted = formatTokenAmount(totalStaked.toString());
      const totalRewardsFormatted = formatTokenAmount(totalRewards.toString());
      
      setContractStats({
        totalStaked: totalStaked.toString(),
        totalRewards: totalRewards.toString(),
        totalBookings: Number(totalBookings),
        totalStakedFormatted,
        totalRewardsFormatted
      });
    } catch (err) {
      console.error('Error loading contract stats:', err);
    }
  };

  // Enhanced format booking data with auto-confirmation
  const formatBookingWithAutoConfirm = (booking) => {
    // Auto-confirm bookings that are currently pending (status 0)
    const originalStatus = Number(booking.status);
    const shouldAutoConfirm = originalStatus === 0; // If pending
    
    return {
      user: booking.user,
      therapist: booking.therapist,
      timestamp: Number(booking.timestamp),
      sessionFee: booking.sessionFee.toString(),
      sessionFeeFormatted: formatTokenAmount(booking.sessionFee.toString()),
      encryptedReportCID: booking.encryptedReportCID,
      status: shouldAutoConfirm ? 'Confirmed' : BOOKING_STATUS[originalStatus],
      originalStatus: originalStatus, // Keep track of original status
      canUploadReport: shouldAutoConfirm || originalStatus === 0 // Allow report upload for confirmed/pending
    };
  };

  // Original format booking data (kept for compatibility)
  const formatBooking = (booking) => ({
    user: booking.user,
    therapist: booking.therapist,
    timestamp: Number(booking.timestamp),
    sessionFee: booking.sessionFee.toString(),
    sessionFeeFormatted: formatTokenAmount(booking.sessionFee.toString()),
    encryptedReportCID: booking.encryptedReportCID,
    status: BOOKING_STATUS[booking.status],
    canUploadReport: true // Always allow report upload
  });

  // Contract interaction functions
  const stakeTokens = async (amount) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.stakeTokens(ethers.parseEther(amount.toString()));
      await tx.wait();
      await loadUserData();
      await loadContractStats();
      return tx.hash;
    } catch (err) {
      throw new Error(`Staking failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const unstakeTokens = async (amount) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.unstakeTokens(ethers.parseEther(amount.toString()));
      await tx.wait();
      await loadUserData();
      await loadContractStats();
      return tx.hash;
    } catch (err) {
      throw new Error(`Unstaking failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (reward) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.completeTask(ethers.parseEther(reward.toString()));
      await tx.wait();
      await loadUserData();
      await loadContractStats();
      return tx.hash;
    } catch (err) {
      throw new Error(`Task completion failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const redeemTokens = async (amount) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.redeemTokens(ethers.parseEther(amount.toString()));
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Token redemption failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const registerTherapist = async (name) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.registerTherapist(name);
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Therapist registration failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const bookTherapist = async (therapistAddress, sessionFee) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.bookTherapist(
        therapistAddress, 
        ethers.parseEther(sessionFee.toString())
      );
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Booking failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.cancelBooking(bookingId);
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Booking cancellation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced function to create and upload therapy report - now works with auto-confirmed bookings
  const createAndUploadTherapyReport = async (bookingId, reportContent) => {
    if (!contract) throw new Error('Contract not initialized');
    if (!ipfsStatus.isConfigured) throw new Error('IPFS service not configured');
    
    setIsLoading(true);
    try {
      // Find the booking to get patient address - check both user and therapist bookings
      let booking = [...userBookings, ...therapistBookings].find(b => 
        (b.user === account || b.therapist === account) && b.canUploadReport
      );
      
      // If not found by account match, try to find by booking index/id
      if (!booking && (userBookings.length > bookingId || therapistBookings.length > bookingId)) {
        booking = userBookings[bookingId] || therapistBookings[bookingId];
      }
      
      if (!booking) {
        throw new Error('Booking not found or not eligible for report upload');
      }

      // Check if report upload is allowed
      if (!booking || booking.originalStatus !== 0) {
        throw new Error('Report upload allowed only for pending bookings');
      }

      // Upload encrypted report to IPFS
      const uploadResult = await ipfsService.uploadTherapyReport(
        reportContent,
        booking.user, // patient address
        {
          therapistAddress: booking.therapist,
          sessionId: bookingId,
          bookingTimestamp: booking.timestamp
        }
      );

      if (!uploadResult.success) {
        throw new Error(`IPFS upload failed: ${uploadResult.error}`);
      }

      // Upload IPFS hash to blockchain
      const tx = await contract.uploadEncryptedReport(bookingId, uploadResult.ipfsHash);
      await tx.wait();
      await loadUserData();

      return {
        success: true,
        transactionHash: tx.hash,
        ipfsHash: uploadResult.ipfsHash,
        retrievalUrl: uploadResult.retrievalUrl
      };
    } catch (err) {
      throw new Error(`Report creation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced function to retrieve and decrypt therapy report
  const retrieveTherapyReport = async (ipfsHash, patientAddress = null) => {
    if (!ipfsStatus.isConfigured) throw new Error('IPFS service not configured');
    
    setIsLoading(true);
    try {
      // Use current account as patient address if not provided
      const targetPatientAddress = patientAddress || account;
      
      const result = await ipfsService.retrieveTherapyReport(ipfsHash, targetPatientAddress);
      
      if (!result.success) {
        throw new Error(`Report retrieval failed: ${result.error}`);
      }

      return {
        success: true,
        reportContent: result.reportContent,
        metadata: result.metadata
      };
    } catch (err) {
      throw new Error(`Report retrieval failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadEncryptedReport = async (bookingId, ipfsCID) => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.uploadEncryptedReport(bookingId, ipfsCID);
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Report upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateTherapist = async () => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.deactivateTherapist();
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Deactivation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateTherapist = async () => {
    if (!contract) throw new Error('Contract not initialized');
    setIsLoading(true);
    try {
      const tx = await contract.reactivateTherapist();
      await tx.wait();
      await loadUserData();
      return tx.hash;
    } catch (err) {
      throw new Error(`Reactivation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Utility function to check if a booking allows report upload
  const canUploadReportForBooking = (booking) => {
    // Allow report upload for pending (0) and confirmed bookings
    return booking && (booking.canUploadReport || booking.originalStatus === 0 || booking.status === 'Confirmed');
  };

  // Utility functions
  const formatTokenAmount = (amount, decimals = 18) => {
    try {
      const formatted = ethers.formatUnits(amount, decimals);
      return parseFloat(formatted).toString();
    } catch (err) {
      console.error('Error formatting token amount:', err);
      return '0';
    }
  };

  const parseTokenAmount = (amount, decimals = 18) => {
    return ethers.parseUnits(amount.toString(), decimals);
  };

  const displayTokens = (amount, options = {}) => {
    const {
      showSymbol = true,
      symbol = 'HTK',
      decimals = 2,
      showZeroAsEmpty = false
    } = options;
    
    const formatted = formatTokenAmount(amount);
    const numValue = parseFloat(formatted);
    
    if (showZeroAsEmpty && numValue === 0) {
      return '';
    }
    
    const displayValue = decimals > 0 ? numValue.toFixed(decimals).replace(/\.?0+$/, '') : Math.floor(numValue).toString();
    
    return showSymbol ? `${displayValue} ${symbol}` : displayValue;
  };

  const fetchTherapistAddressesFromEvents = useCallback(async () => {
    if (!contract || !provider) return [];
  
    const cached = JSON.parse(localStorage.getItem("therapistAddresses") || "[]");
    if (cached.length > 0) return cached;

    try {
      const filter = contract.filters.TherapistRegistered();
      const latestBlock = await provider.getBlockNumber();
      const chunkSize = 10000;
      const startBlock = Math.max(latestBlock - 200000, 0);

      let addresses = new Set();

      for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += chunkSize) {
        const toBlock = Math.min(fromBlock + chunkSize - 1, latestBlock);
        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        events.forEach((event) => {
          addresses.add(event.args.therapist.toLowerCase());
        });
      }

      const addressArray = Array.from(addresses);
      localStorage.setItem("therapistAddresses", JSON.stringify(addressArray));
      return addressArray;
    } catch (err) {
      console.error("Error fetching therapist registration events:", err);
      return [];
    }
  }, [contract, provider]);

  // Handle account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount(null);
        setSigner(null);
        setContract(null);
      } else {
        initializeContract();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [initializeContract]);

  // Auto-connect on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await initializeContract();
          }
        } catch (err) {
          console.error('Auto-connect failed:', err);
        }
      }
    };

    autoConnect();
  }, [initializeContract]);

  const contextValue = {
    // Connection state
    provider,
    signer,
    contract,
    account,
    isConnected,
    isLoading,
    error,
    
    // IPFS state
    ipfsService,
    ipfsStatus,
    
    // Data
    userData,
    therapistData,
    userBookings,
    therapistBookings,
    contractStats,
    
    // Contract constants
    constants: CONTRACT_CONFIG.constants,
    
    // Functions
    connectWallet,
    loadUserData,
    loadContractStats,
    
    // User functions
    stakeTokens,
    unstakeTokens,
    completeTask,
    redeemTokens,
    
    // Therapist functions
    registerTherapist,
    deactivateTherapist,
    reactivateTherapist,
    bookTherapist,
    cancelBooking,
    uploadEncryptedReport,
    fetchTherapistAddressesFromEvents,
    
    // Enhanced IPFS functions
    createAndUploadTherapyReport,
    retrieveTherapyReport,
    
    // Utility functions
    formatTokenAmount,
    parseTokenAmount,
    displayTokens,
    canUploadReportForBooking,
    
    // Constants
    BOOKING_STATUS
  };

  return (
    <HabitBlockchainContext.Provider value={contextValue}>
      {children}
    </HabitBlockchainContext.Provider>
  );
};

export default HabitBlockchainProvider;