import React, { useState, useRef, useEffect } from 'react';

const TimePicker = ({ value, onChange, label, required = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState('AM');
  const pickerRef = useRef(null);

  // Parse value when picker opens
  const openPicker = () => {
    if (value) {
      const [hours, mins] = value.split(':').map(Number);
      setTempHour(hours % 12 || 12);
      setTempMinute(mins);
      setTempPeriod(hours >= 12 ? 'PM' : 'AM');
    } else {
      setTempHour(9);
      setTempMinute(0);
      setTempPeriod('AM');
    }
    setShowPicker(true);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirm = () => {
    let h = tempHour;
    if (tempPeriod === 'AM') {
      h = tempHour === 12 ? 0 : tempHour;
    } else {
      h = tempHour === 12 ? 12 : tempHour + 12;
    }
    const timeStr = `${String(h).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    onChange(timeStr);
    setShowPicker(false);
  };

  const formatDisplayTime = () => {
    if (!value) return 'Select time';
    const [hours, mins] = value.split(':').map(Number);
    const hr = hours % 12 || 12;
    const per = hours >= 12 ? 'PM' : 'AM';
    return `${hr}:${String(mins).padStart(2, '0')} ${per}`;
  };

  return (
    <div className="relative" ref={pickerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Time Display Button */}
      <button
        type="button"
        onClick={openPicker}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
      >
        <span className={value ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {formatDisplayTime()}
        </span>
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Time Picker Dropdown */}
      {showPicker && (
        <div className="absolute z-50 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72 left-0">
          {/* Time Display */}
          <div className="text-center mb-4 py-3 bg-blue-50 rounded-lg">
            <span className="text-2xl font-bold text-blue-600">
              {tempHour}:{String(tempMinute).padStart(2, '0')} {tempPeriod}
            </span>
          </div>

          {/* Hour Selection */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Hour</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setTempHour(hour)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    tempHour === hour
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          {/* Minute Selection */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Minute</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 15, 30, 45].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setTempMinute(min)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    tempMinute === min
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  :{String(min).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM Selection */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTempPeriod('AM')}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  tempPeriod === 'AM'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setTempPeriod('PM')}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                  tempPeriod === 'PM'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
