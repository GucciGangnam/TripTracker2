import { useState, useEffect } from 'react';
import { MapPin, Car, Clock, Download, Share2, CircleCheck, AlignJustify, CircleX } from 'lucide-react';


const App = () => {
  const [currentStep, setCurrentStep] = useState('landing');
  const [formData, setFormData] = useState({
    date: '',
    purpose: '',
    startPostcode: '',
    startMileage: '',
    endPostcode: '',
    endMileage: '',
    totalDistance: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [journeyListRefresh, setJourneyListRefresh] = useState(0);

  useEffect(() => {
    const storedData = localStorage.getItem('jossJourneyData');
    if (!storedData) {
      localStorage.setItem('jossJourneyData', JSON.stringify([]));
    }
  }, []);

  const goHome = () => {
    setCurrentStep('landing');
    setFormData({
      date: '',
      purpose: '',
      startPostcode: '',
      startMileage: '',
      endPostcode: '',
      endMileage: '',
      totalDistance: 0
    });
    // setJourneyListRefresh(prev => prev + 1); // Trigger re-render.   THIS MIGHT NOT BE NEEDED
  }

  // Function to get postcode from coordinates using postcodes.io API
  const getPostcodeFromLocation = async (lat, lon) => {
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}`);
      const data = await response.json();

      if (data.status === 200 && data.result && data.result.length > 0) {
        // Return the closest postcode
        return data.result[0].postcode;
      } else {
        // Fallback if no postcode found
        return `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Error fetching postcode:', error);
      // Fallback to coordinates if API fails
      return `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  };

  // Start new journey
  const startNewJourney = async () => {
    // Reset form data with today's date
    const today = new Date().toLocaleDateString();
    setFormData({
      date: today,
      purpose: '',
      startPostcode: '',
      startMileage: '',
      endPostcode: '',
      endMileage: '',
      totalDistance: 0
    });
    setIsLoading(true);
    try {
      const location = await getCurrentLocation();
      const postcode = await getPostcodeFromLocation(location.lat, location.lon);

      setFormData(prev => ({
        ...prev,
        startPostcode: postcode
      }));
      setCurrentStep('purpose');
    } catch (error) {
      console.error('Error getting start location:', error);
      setCurrentStep('locationError');
    }
    setIsLoading(false);
  };

  // Finish trip - get end location
  const finishTrip = async () => {
    setIsLoading(true);
    try {
      const location = await getCurrentLocation();
      const postcode = await getPostcodeFromLocation(location.lat, location.lon);

      setFormData({
        ...formData,
        endPostcode: postcode
      });
      setCurrentStep('endMileage');
    } catch (error) {
      console.error('Error getting end location:', error);
      setCurrentStep('endLocationError');
    }
    setIsLoading(false);
  };

  // Calculate total distance
  useEffect(() => {
    if (formData.startMileage && formData.endMileage) {
      const distance = parseInt(formData.endMileage) - parseInt(formData.startMileage);
      setFormData(prev => ({
        ...prev,
        totalDistance: distance
      }));
    }
  }, [formData.startMileage, formData.endMileage]);

  // Add form data to localStorage
  useEffect(() => {
    if (currentStep === 'final') {
      const storedData = JSON.parse(localStorage.getItem('jossJourneyData')) || [];
      storedData.push({
        id: Date.now(),
        date: formData.date,
        purpose: formData.purpose,
        startPostcode: formData.startPostcode,
        endPostcode: formData.endPostcode,
        startMileage: formData.startMileage,
        endMileage: formData.endMileage,
        totalDistance: formData.totalDistance
      });
      localStorage.setItem('jossJourneyData', JSON.stringify(storedData));
    }
  }, [currentStep]);

  // SHARE DATA FUNCTION
  const shareData = () => {
    let text = `Business Journey Log
Date: ${formData.date}
Purpose: ${formData.purpose}
Start: ${formData.startPostcode}
End: ${formData.endPostcode}
Start Mileage: ${formData.startMileage}
End Mileage: ${formData.endMileage}
Total Distance: ${formData.totalDistance} miles`;
    // Normalize line endings and trim
    text = text.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
    if (navigator.share) {
      navigator.share({
        title: 'Business Journey Log',
        text: text
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Journey data copied to clipboard!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }

    function fallbackCopy(copyText) {
      // Use CRLF for textarea to avoid extra blank lines on paste
      const crlfText = copyText.replace(/\n/g, '\r\n');
      const textarea = document.createElement('textarea');
      textarea.value = crlfText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('Journey data copied to clipboard!');
      } catch (err) {
        alert('Unable to copy journey data automatically. Please take a screenshot.');
      }
      document.body.removeChild(textarea);
    }
  };


  /// DOWNLOAD DATA FUNCTION
  const downloadData = () => {
    const data = `Business Journey Log
Date: ${formData.date}
Purpose: ${formData.purpose}
Start Location: ${formData.startPostcode}
End Location: ${formData.endPostcode}
Start Mileage: ${formData.startMileage}
End Mileage: ${formData.endMileage}
Total Distance: ${formData.totalDistance} miles`;

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journey-${formData.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };



  if (isLoading) {
    return (
      <div className="min-h-full w-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }




  return (
    <div className="min-h-full bg-gray-50 w-screen">

      {currentStep === 'myJourneys' && (
        <div className="flex flex-col items-center min-h-full p-4" key={journeyListRefresh}>
          <div className="flex flex-col items-center pt-20 min-h-full p-0 w-full">

            <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={() => setCurrentStep('landing')}>
              <Car /> New Trip
            </button>


            {/* Render all teh saved journeys */}
            <h2 className="text-2xl font-bold text-gray-900 mb-8">My Journeys</h2>
            <div className=" bg-white w-full rounded-lg shadow-md p-6">
              {JSON.parse(localStorage.getItem('jossJourneyData')).length === 0 ? (
                <div className="text-gray-600 text-center">No journeys recorded yet.</div>
              ) : (
                <div className="text-gray-600 text-center mb-4">Total Journeys: {JSON.parse(localStorage.getItem('jossJourneyData')).length}</div>
              )}
              {JSON.parse(localStorage.getItem('jossJourneyData')).map((journey) => (
                <div key={journey.id} className="border-b pb-4 flex flex-col">
                  <div className="text-gray-600">{journey.date}</div>
                  <div className="text-gray-800 font-semibold pb-2">{journey.purpose}</div>
                  <div className="text-gray-600">From: {journey.startPostcode}</div>
                  <div className="text-gray-600">To: {journey.endPostcode}</div>
                  <div className="text-gray-600">Start Mileage: {journey.startMileage}</div>
                  <div className="text-gray-600">End Mileage: {journey.endMileage}</div>
                  <div className="text-gray-600">Total Distance: {journey.totalDistance} miles</div>
                  <div className='flex gap-2 mt-4 w-full justify-evenly'>
                    {/* Make a button to delete the journey with the id of journey.id from teh localStorage.getItem('jossJourneyData') */}
                    <button
                      onClick={() => {
                        const storedData = JSON.parse(localStorage.getItem('jossJourneyData'));
                        const updatedData = storedData.filter(j => j.id !== journey.id);
                        localStorage.setItem('jossJourneyData', JSON.stringify(updatedData));
                        setJourneyListRefresh(prev => prev + 1); // Trigger re-render
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Landing Page */}
      {currentStep === 'landing' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">

          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={() => setCurrentStep('myJourneys')}>
            <AlignJustify /> My Journeys
          </button>


          <div className="text-center mb-12">
            <Car className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Joss' Mileage Tracker</h1>
            <p className="text-gray-600">Love from Alex</p>
          </div>

          <button
            onClick={startNewJourney}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg text-xl transition-colors"
          >
            Start New Journey
          </button>
        </div>
      )}

      {/* START Location Error !!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
      {currentStep === 'locationError' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">

          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>


          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Error retreivig location</h2>

            <input
              type="text"
              value={formData.startPostcode}
              onChange={(e) => setFormData({ ...formData, startPostcode: e.target.value })}
              placeholder="Enter Postcode"
              className="w-full text-center p-4 border border-gray-300 rounded-lg text-4xl focus:outline-none focus:ring-2 focus:ring-blue-500"

              autoFocus
            />

            <button
              onClick={() => setCurrentStep('purpose')}
              disabled={!formData.startPostcode.trim()}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Purpose Input */}
      {currentStep === 'purpose' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">

          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>


          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Purpose of Journey</h2>

            <textarea
              ref={el => el && el.focus()}
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Speak or type the purpose of your journey..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="text"
            />

            <button
              onClick={() => setCurrentStep('startMileage')}
              disabled={!formData.purpose.trim()}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}


      {/* Start Mileage Input */}
      {currentStep === 'startMileage' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">

          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>


          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Staring Milage</h2>

            <input
              type="number"
              value={formData.startMileage}
              onChange={(e) => setFormData({ ...formData, startMileage: e.target.value })}
              placeholder="Enter Number on your Odometer"
              className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
            />

            <button
              onClick={() => setCurrentStep('review')}
              disabled={!formData.startMileage.trim()}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}




      {/* Review Screen */}
      {currentStep === 'review' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">
          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Journey Started</h2>

            <div className="bg-white rounded-lg p-6 shadow-md mb-8">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Date: {formData.date}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">From: {formData.startPostcode}</span>
                </div>
                <div className="flex items-center">
                  <Car className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Start Mileage: {formData.startMileage}</span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Purpose:</p>
                  <p className="text-gray-700">{formData.purpose}</p>
                </div>
              </div>
            </div>

            <button
              onClick={finishTrip}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Finished Trip
            </button>
          </div>
        </div>
      )}

      {/* END Location Error !!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
      {currentStep === 'endLocationError' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">
          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Error retreivig location</h2>

            <input
              type="text"
              value={formData.endPostcode}
              onChange={(e) => setFormData({ ...formData, endPostcode: e.target.value })}
              placeholder="Enter Postcode"
              className="w-full text-center p-4 border border-gray-300 rounded-lg text-4xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            <button
              onClick={() => setCurrentStep('endMileage')}
              disabled={!formData.endPostcode.trim()}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* End Mileage Input */}
      {currentStep === 'endMileage' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">
          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={goHome}>
            <CircleX /> Cancel Trip
          </button>
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">End Milage</h2>

            <input
              type="number"
              value={formData.endMileage}
              onChange={(e) => setFormData({ ...formData, endMileage: e.target.value })}
              placeholder="Enter Number on your Odometer"
              className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
            />

            <button
              onClick={() => setCurrentStep('final')}
              disabled={!formData.endMileage.trim()}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg text-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Final Review */}
      {currentStep === 'final' && (
        <div className="flex flex-col items-center justify-center min-h-full p-6">

          <button className='flex gap-2 items-center mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors absolute left-5 top-5' onClick={() => setCurrentStep('myJourneys')}>
            <AlignJustify /> My Journeys
          </button>

          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center flex justify-center items-center gap-2 ">Journey Saved <CircleCheck color='green' /> </h2>


            <div className="bg-white rounded-lg p-6 shadow-md mb-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{formData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-semibold">{formData.startPostcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-semibold">{formData.endPostcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Mileage:</span>
                  <span className="font-semibold">{formData.startMileage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Mileage:</span>
                  <span className="font-semibold">{formData.endMileage}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Distance:</span>
                    <span className="font-bold text-green-600">{formData.totalDistance} miles</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Purpose:</p>
                  <p className="text-gray-700">{formData.purpose}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={shareData}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center transition-colors"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share Journey Data
              </button>

              <button
                onClick={downloadData}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Download as File
              </button>

              <button
                onClick={() => setCurrentStep('landing')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start New Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;