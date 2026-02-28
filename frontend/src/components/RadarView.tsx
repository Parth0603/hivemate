import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ProfilePreviewModal from './ProfilePreviewModal';
import { getApiBaseUrl, getWsBaseUrl } from '../utils/runtimeConfig';
import './RadarView.css';

interface RadarDot {
  userId: string;
  latitude: number;
  longitude: number;
  distance: number;
  gender?: string;
  name?: string;
  photo?: string;
}

interface RadarFilters {
  skills: string[];
  profession: string;
  gender: string;
}

interface HoverLabel {
  userId: string;
  name: string;
  x: number;
  y: number;
}

interface SelectedRadarUser {
  userId: string;
  name?: string;
  photo?: string;
}

const RadarView = () => {
  const getStoredVisibilityMode = (): 'explore' | 'vanish' => {
    const savedMode = localStorage.getItem('radarVisibilityMode');
    return savedMode === 'explore' || savedMode === 'vanish' ? savedMode : 'vanish';
  };

  const [visibilityMode, setVisibilityMode] = useState<'explore' | 'vanish'>(() => {
    // Load saved mode from localStorage, default to 'vanish'
    return getStoredVisibilityMode();
  });
  const [nearbyUsers, setNearbyUsers] = useState<RadarDot[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<RadarDot[]>([]);
  const [distanceRange, setDistanceRange] = useState(50); // km
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedRadarUser | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<HoverLabel | null>(null);
  const [filters, setFilters] = useState<RadarFilters>({
    skills: [],
    profession: '',
    gender: ''
  });
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const [radarRenderTick, setRadarRenderTick] = useState(0);
  const locationWatchIdRef = useRef<number | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasBootstrappedLocationSyncRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMovedRef = useRef(false);
  const lastTouchHandledAtRef = useRef(0);

  const API_URL = getApiBaseUrl();
  const WS_URL = getWsBaseUrl();

  const requestCurrentLocation = async (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );
    });
  };

  useEffect(() => {
    localStorage.setItem('radarVisibilityMode', visibilityMode);
  }, [visibilityMode]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (visibilityMode !== 'explore' || !userLocation) return;
    if (hasBootstrappedLocationSyncRef.current) return;

    hasBootstrappedLocationSyncRef.current = true;
    updateLocationOnServer(userLocation);
    fetchNearbyUsers(userLocation);
  }, [visibilityMode, userLocation]);

  useEffect(() => {
    const syncVisibilityMode = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/location/visibility/mode`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return;
        const data = await response.json();
        if (data.mode === 'explore' || data.mode === 'vanish') {
          setVisibilityMode(data.mode);
        }
      } catch (error) {
        console.error('Failed to sync visibility mode:', error);
      }
    };

    syncVisibilityMode();
  }, [API_URL]);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const initialLocation = await requestCurrentLocation();
        setUserLocation(initialLocation);
      } catch (error) {
        console.error('Location error:', error);
        alert('Location access is required to use Explore Mode. Please enable location permissions.');
      }
    };

    initializeLocation();

    if (navigator.geolocation) {
      locationWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );
    }

    // Initialize WebSocket
    const token = localStorage.getItem('token');
    if (token) {
      socketRef.current = io(WS_URL, {
        auth: { token },
        transports: ['websocket']
      });

      socketRef.current.on('radar:update', (data: any) => {
        // Update nearby users from WebSocket
        console.log('Radar update:', data);
      });

      socketRef.current.on('nearby:notification', (data: any) => {
        console.log('Someone nearby:', data);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, [WS_URL]);

  useEffect(() => {
    if (visibilityMode === 'explore') {
      hasBootstrappedLocationSyncRef.current = false;
      const syncRadarData = async () => {
        let currentLocation = userLocationRef.current;
        if (!currentLocation) return;
        try {
          currentLocation = await requestCurrentLocation();
        } catch (error) {
          console.error('Using last known location for radar sync:', error);
        }

        await updateLocationOnServer(currentLocation);
        await fetchNearbyUsers(currentLocation);
      };

      syncRadarData();

      // Set up auto-refresh interval (every 10 seconds)
      const intervalId = setInterval(() => {
        syncRadarData();
      }, 10000);

      return () => clearInterval(intervalId);
    }
    hasBootstrappedLocationSyncRef.current = false;
  }, [visibilityMode, distanceRange]);

  useEffect(() => {
    // Apply filters to nearby users
    let filtered = [...nearbyUsers];

    if (filters.gender) {
      filtered = filtered.filter(user => user.gender === filters.gender);
    }

    setFilteredUsers(filtered);
  }, [nearbyUsers, filters]);

  useEffect(() => {
    drawRadar();
  }, [filteredUsers, distanceRange, hoverLabel, focusedUserId, radarRenderTick]);

  useEffect(() => {
    if (!focusedUserId) return;
    const stillVisible = filteredUsers.some((u) => u.userId === focusedUserId);
    if (!stillVisible) {
      setFocusedUserId(null);
    }
  }, [filteredUsers, focusedUserId]);

  const fetchNearbyUsers = async (location = userLocation) => {
    if (!location) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const radiusInMeters = distanceRange * 1000; // Convert km to meters
      const response = await fetch(
        `${API_URL}/api/location/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radiusInMeters}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const users = data.nearbyUsers || [];
        // Map the response to match RadarDot interface
        const mappedUsers = users.map((user: any) => ({
          userId: user.userId,
          latitude: user.coordinates?.latitude || 0,
          longitude: user.coordinates?.longitude || 0,
          distance: user.distance || 0,
          gender: user.gender,
          name: user.name,
          photo: user.photo || ''
        }));
        setNearbyUsers(mappedUsers);
        console.log('Nearby users found:', mappedUsers.length);
      }
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocationOnServer = async (location = userLocation) => {
    if (!location) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          mode: visibilityMode
        })
      });

      console.log('Location updated:', location, 'Mode:', visibilityMode);

      // Emit location update via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('location:update', {
          latitude: location.lat,
          longitude: location.lng,
          mode: visibilityMode
        });
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const toggleVisibilityMode = async () => {
    const previousMode = visibilityMode;
    const newMode = visibilityMode === 'explore' ? 'vanish' : 'explore';
    
    setVisibilityMode(newMode);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/location/visibility/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode: newMode })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to update visibility mode');
      }

      // Emit visibility change via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('visibility:toggle', { mode: newMode });
      }

      if (newMode === 'vanish') {
        setNearbyUsers([]);
        setHoverLabel(null);
      }

      if (newMode === 'explore') {
        try {
          const freshLocation = await requestCurrentLocation();
          setUserLocation(freshLocation);
          await updateLocationOnServer(freshLocation);
          await fetchNearbyUsers(freshLocation);
        } catch (locationError) {
          console.error('Failed to refresh location for explore mode:', locationError);
        }
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      setVisibilityMode(previousMode);
      alert(error instanceof Error ? error.message : 'Failed to toggle visibility mode');
    }
  };

  const drawRadar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !userLocation) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw radar circles with subtle colors
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw crosshair
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - maxRadius);
    ctx.lineTo(centerX, centerY + maxRadius);
    ctx.moveTo(centerX - maxRadius, centerY);
    ctx.lineTo(centerX + maxRadius, centerY);
    ctx.stroke();

    // Draw scanning line with gradient
    const currentTime = Date.now();
    const scanAngle = (currentTime / 30) % 360;
    const scanRad = (scanAngle * Math.PI) / 180;
    
    const gradient = ctx.createLinearGradient(
      centerX,
      centerY,
      centerX + Math.cos(scanRad) * maxRadius,
      centerY + Math.sin(scanRad) * maxRadius
    );
    gradient.addColorStop(0, 'rgba(0, 150, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 150, 255, 0.6)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(scanRad) * maxRadius,
      centerY + Math.sin(scanRad) * maxRadius
    );
    ctx.stroke();

    // Draw scan arc (trail effect)
    ctx.fillStyle = 'rgba(0, 150, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, maxRadius, scanRad - 0.5, scanRad);
    ctx.closePath();
    ctx.fill();

    // Draw center point (user)
    ctx.fillStyle = '#0096ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0096ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const sortedUsers = [...filteredUsers].sort((a, b) => a.distance - b.distance);
    const drawableUsers: Array<{
      user: RadarDot;
      x: number;
      y: number;
    }> = [];

    sortedUsers.forEach((user) => {
      const distanceRatio = user.distance / (distanceRange * 1000);
      if (distanceRatio > 1) return;

      const latDiff = user.latitude - userLocation.lat;
      const lngDiff = user.longitude - userLocation.lng;
      const angle = Math.atan2(lngDiff, latDiff);
      
      const radius = distanceRatio * maxRadius;
      const x = centerX + Math.sin(angle) * radius;
      const y = centerY - Math.cos(angle) * radius;
      drawableUsers.push({ user, x, y });
    });

    const isMobile = window.innerWidth <= 768;
    const minimumSpacing = isMobile ? 46 : 38;
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < drawableUsers.length; i++) {
        for (let j = i + 1; j < drawableUsers.length; j++) {
          const a = drawableUsers[i];
          const b = drawableUsers[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          if (distance < minimumSpacing) {
            const push = (minimumSpacing - distance) / 2;
            const nx = dx / distance;
            const ny = dy / distance;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }

    const clampToRadar = (point: { x: number; y: number }, padding: number) => {
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      const allowedRadius = Math.max(0, maxRadius - padding);
      if (distanceFromCenter > allowedRadius && distanceFromCenter > 0) {
        const scale = allowedRadius / distanceFromCenter;
        point.x = centerX + dx * scale;
        point.y = centerY + dy * scale;
      }
    };

    // Draw nearby users
    drawableUsers.forEach(({ user, x, y }) => {
      const isFocused = focusedUserId === user.userId;
      const isHovered = hoverLabel?.userId === user.userId;
      const isMobile = window.innerWidth <= 768;
      const baseRadius = isMobile ? 22 : 17;
      const avatarRadius = isHovered || isFocused ? baseRadius + 4 : baseRadius;
      const drawPoint = { x, y };
      clampToRadar(drawPoint, avatarRadius + 2);
      const drawX = drawPoint.x;
      const drawY = drawPoint.y;

      const color = user.gender === 'female' ? '#ff0080' : user.gender === 'male' ? '#0096ff' : '#9ca3af';
      const hasFocusMode = Boolean(focusedUserId);
      ctx.globalAlpha = hasFocusMode && !isFocused ? 0.28 : 1;
      ctx.filter = hasFocusMode && !isFocused ? 'blur(1.5px)' : 'none';

      const avatarImage = getAvatarImage(user);
      ctx.beginPath();
      ctx.arc(drawX, drawY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.save();
      ctx.clip();

      if (avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0) {
        ctx.drawImage(avatarImage, drawX - avatarRadius, drawY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(drawX - avatarRadius, drawY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      }
      ctx.restore();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isMobile ? 3 : 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, avatarRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = isMobile ? 16 : 12;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, avatarRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.filter = 'none';

      (user as any)._canvasX = drawX;
      (user as any)._canvasY = drawY;
      (user as any)._hitRadius = avatarRadius + 8;
    });

    if (focusedUserId) {
      const focusedUser = sortedUsers.find((u) => u.userId === focusedUserId);
      if (focusedUser && (focusedUser as any)._canvasX !== undefined) {
        const x = (focusedUser as any)._canvasX;
        const y = (focusedUser as any)._canvasY;
        const ringColor = focusedUser.gender === 'female' ? '#ff0080' : focusedUser.gender === 'male' ? '#0096ff' : '#64748b';

        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (hoverLabel) {
      const label = hoverLabel.name || 'Unknown User';
      ctx.font = 'bold 12px Arial';
      const textWidth = ctx.measureText(label).width;
      const paddingX = 8;
      const labelWidth = textWidth + paddingX * 2;
      const labelHeight = 22;
      const labelX = hoverLabel.x - labelWidth / 2;
      const labelY = hoverLabel.y - 30;

      ctx.fillStyle = 'rgba(0, 150, 255, 0.95)';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX + paddingX, labelY + 15);
    }

    // Request next frame for continuous scanning animation
    requestAnimationFrame(drawRadar);
  };

  const getAvatarImage = (user: RadarDot): HTMLImageElement | null => {
    const photoUrl = (user.photo || '').trim();
    if (!photoUrl) return null;

    const cached = imageCacheRef.current.get(user.userId);
    if (cached !== undefined) {
      return cached;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setRadarRenderTick((prev) => prev + 1);
    img.onerror = () => {
      imageCacheRef.current.set(user.userId, null);
      setRadarRenderTick((prev) => prev + 1);
    };
    img.src = photoUrl;
    imageCacheRef.current.set(user.userId, img);
    return img;
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const findUserAtPoint = (x: number, y: number, hitRadius: number): RadarDot | null => {
    let nearestUser: RadarDot | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const user of filteredUsers) {
      const dotX = (user as any)._canvasX;
      const dotY = (user as any)._canvasY;
      const userHitRadius = (user as any)._hitRadius || hitRadius;
      if (dotX === undefined || dotY === undefined) continue;

      const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
      if (distance <= Math.max(hitRadius, userHitRadius) && distance < nearestDistance) {
        nearestDistance = distance;
        nearestUser = user;
      }
    }

    return nearestUser;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ignore synthetic click that follows a handled touch tap on mobile.
    if (Date.now() - lastTouchHandledAtRef.current < 700) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const hitRadius = window.innerWidth <= 768 ? 35 : 22;
    const tappedUser = findUserAtPoint(coords.x, coords.y, hitRadius);
    if (tappedUser) {
      console.log('Clicked on user:', tappedUser.userId, 'Name:', tappedUser.name);
      setSelectedUser({
        userId: tappedUser.userId,
        name: tappedUser.name,
        photo: tappedUser.photo
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const hitRadius = window.innerWidth <= 768 ? 35 : 28;
    const hoveredUser = findUserAtPoint(coords.x, coords.y, hitRadius);

    // Update cursor and show tooltip
    if (hoveredUser) {
      canvas.style.cursor = 'pointer';
      canvas.title = hoveredUser.name || 'Unknown User';
      const dotX = (hoveredUser as any)._canvasX;
      const dotY = (hoveredUser as any)._canvasY;
      setHoverLabel({
        userId: hoveredUser.userId,
        name: hoveredUser.name || 'Unknown User',
        x: dotX,
        y: dotY
      });
    } else {
      canvas.style.cursor = 'default';
      canvas.title = '';
      setHoverLabel(null);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      return;
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const hitRadius = window.innerWidth <= 768 ? 40 : 28;
    const tappedUser = findUserAtPoint(coords.x, coords.y, hitRadius);
    if (tappedUser) {
      setSelectedUser({
        userId: tappedUser.userId,
        name: tappedUser.name,
        photo: tappedUser.photo
      });
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      return;
    }

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    touchStartRef.current = {
      x: coords.x,
      y: coords.y,
      time: Date.now()
    };
    touchMovedRef.current = false;
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    const dx = coords.x - touchStartRef.current.x;
    const dy = coords.y - touchStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 12) {
      touchMovedRef.current = true;
    }
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current || touchMovedRef.current) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      return;
    }

    const elapsed = Date.now() - touchStartRef.current.time;
    if (elapsed > 450) {
      touchStartRef.current = null;
      touchMovedRef.current = false;
      return;
    }

    const touch = e.changedTouches[0];
    if (!touch) return;

    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    const hitRadius = 40;
    const tappedUser = findUserAtPoint(coords.x, coords.y, hitRadius);
    if (tappedUser) {
      e.preventDefault();
      lastTouchHandledAtRef.current = Date.now();
      setSelectedUser({
        userId: tappedUser.userId,
        name: tappedUser.name,
        photo: tappedUser.photo
      });
    }

    touchStartRef.current = null;
    touchMovedRef.current = false;
  };

  const handleCanvasMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
      canvas.title = '';
    }
    setHoverLabel(null);
  };

  const clearFilters = () => {
    setFilters({
      skills: [],
      profession: '',
      gender: ''
    });
  };

  const usersInRange = [...filteredUsers]
    .filter((user) => user.distance <= distanceRange * 1000)
    .sort((a, b) => a.distance - b.distance);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.skills.length > 0) count++;
    if (filters.profession) count++;
    if (filters.gender) count++;
    return count;
  };

  return (
    <div className="radar-view">
      <div className="radar-unified-container">
        {/* Controls Section */}
        <div className="radar-controls">
          <div className="visibility-toggle">
            <label className="toggle-label">
              <span className={visibilityMode === 'explore' ? 'active' : ''}>
                {visibilityMode === 'explore' ? 'Explore Mode' : 'Vanish Mode'}
              </span>
              <input
                type="checkbox"
                checked={visibilityMode === 'explore'}
                onChange={toggleVisibilityMode}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="distance-control">
            <label>
              Distance: {distanceRange} km
              <input
                type="range"
                min="1"
                max="1000"
                value={distanceRange}
                onChange={(e) => setDistanceRange(parseInt(e.target.value))}
                disabled={visibilityMode === 'vanish'}
              />
            </label>
          </div>

          <button
            className="filter-toggle-btn"
            onClick={() => setShowFilters(!showFilters)}
            disabled={visibilityMode === 'vanish'}
          >
            Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && visibilityMode === 'explore' && (
          <div className="radar-filter-panel">
            <div className="filter-header">
              <h4>Filter Nearby Users</h4>
              {getActiveFilterCount() > 0 && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear All
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="filter-results-info">
              Showing {filteredUsers.length} of {nearbyUsers.length} users
            </div>
          </div>
        )}

        {/* Radar Canvas Section */}
        <div className="radar-container">
          {visibilityMode === 'vanish' ? (
            <div className="vanish-message">
              <h3>You are in Vanish Mode</h3>
              <p>Turn on Explore Mode to discover people nearby</p>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={700}
                height={700}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onPointerDown={handleCanvasPointerDown}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
                onMouseLeave={handleCanvasMouseLeave}
                className="radar-canvas"
              />
              {loading && (
                <div className="radar-loading">Updating...</div>
              )}
              {!loading && filteredUsers.length === 0 && nearbyUsers.length > 0 && (
                <div className="no-users-message">
                  No users match your filters
                </div>
              )}
              {!loading && nearbyUsers.length === 0 && (
                <div className="no-users-message">
                  No users nearby in explore mode
                </div>
              )}
            </>
          )}
        </div>

        {/* Nearby List Section */}
        {visibilityMode === 'explore' && (
          <div className="nearby-list-section">
            <div className="nearby-list-header">
              <h4>Profiles In Range ({usersInRange.length})</h4>
              {focusedUserId && (
                <button
                  className="clear-focus-btn"
                  onClick={() => setFocusedUserId(null)}
                  type="button"
                >
                  Clear Focus
                </button>
              )}
            </div>

            {usersInRange.length === 0 ? (
              <div className="nearby-empty">No profiles within current filter and distance.</div>
            ) : (
              <div className="nearby-list">
                {usersInRange.map((user) => {
                  const isFocused = focusedUserId === user.userId;
                  return (
                    <div
                      key={user.userId}
                      className={`nearby-row ${isFocused ? 'focused' : ''}`}
                      onClick={() =>
                        setSelectedUser({
                          userId: user.userId,
                          name: user.name,
                          photo: user.photo
                        })
                      }
                    >
                      <div className="nearby-main">
                        <div className={`nearby-dot ${user.gender === 'female' ? 'female' : user.gender === 'male' ? 'male' : 'other'}`}></div>
                        <div className="nearby-meta">
                          <div className="nearby-name">{user.name || 'Unknown User'}</div>
                          <div className="nearby-distance">{(user.distance / 1000).toFixed(2)} km away</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`eye-focus-btn ${isFocused ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedUserId((prev) => (prev === user.userId ? null : user.userId));
                        }}
                        aria-label={isFocused ? 'Remove focus' : 'Focus on this user'}
                        title={isFocused ? 'Remove Focus' : 'Focus On Radar'}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path
                            d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          />
                          <circle cx="12" cy="12" r="3.1" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedUser && (
        <ProfilePreviewModal
          userId={selectedUser.userId}
          initialName={selectedUser.name}
          initialPhotoUrl={selectedUser.photo}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default RadarView;
