const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

/**
 * Process holidays from Calendarific API
 */
function processCalendarificHolidays(holidays) {
  return holidays.map(holiday => ({
    name: holiday.name,
    date: holiday.date.iso,
    type: holiday.type[0] || 'public',
    description: holiday.description || '',
    country: holiday.country?.name || ''
  }));
}

/**
 * Process holidays from Nager API
 */
function processNagerHolidays(holidays) {
  return holidays.map(holiday => ({
    name: holiday.name,
    date: holiday.date,
    type: 'public',
    description: holiday.localName || '',
    country: 'India'
  }));
}

/**
 * Get national holidays for a country and year
 */
const getHolidays = async (req, res) => {
  try {
    const { country = 'IN', year = new Date().getFullYear() } = req.query;

    // Try primary API first (Calendarific - requires API key)
    const apiKey = process.env.HOLIDAYS_API_KEY;
    
    if (apiKey) {
      try {
        const response = await fetch(
          `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${year}&type=national`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const holidays = processCalendarificHolidays(data.response?.holidays || []);
          
          return res.status(200).json(new ApiResponse(
            200,
            {
              holidays,
              source: 'calendarific',
              country,
              year
            },
            "Holidays fetched successfully"
          ));
        }
      } catch (error) {
        console.log('Calendarific API failed, trying fallback...');
      }
    }

    // Fallback to free public holidays API
    try {
      const fallbackResponse = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const holidays = processNagerHolidays(fallbackData);

        return res.status(200).json(new ApiResponse(
          200,
          {
            holidays,
            source: 'nager',
            country,
            year
          },
          "Holidays fetched successfully (fallback)"
        ));
      }
    } catch (fallbackError) {
      console.log('Fallback API also failed');
    }

    // If both APIs fail, return default holidays for India
    const defaultHolidays = [
      { name: "New Year's Day", date: `${year}-01-01`, type: 'public', description: "New Year's Day", country: 'India' },
      { name: "Republic Day", date: `${year}-01-26`, type: 'public', description: "Republic Day of India", country: 'India' },
      { name: "Independence Day", date: `${year}-08-15`, type: 'public', description: "Independence Day of India", country: 'India' },
      { name: "Gandhi Jayanti", date: `${year}-10-02`, type: 'public', description: "Mahatma Gandhi's Birthday", country: 'India' }
    ];

    return res.status(200).json(new ApiResponse(
      200,
      {
        holidays: defaultHolidays,
        source: 'default',
        country,
        year
      },
      "Default holidays returned (APIs unavailable)"
    ));

  } catch (error) {
    console.error('Holidays API Error:', error);
    throw new ApiError(500, "Failed to fetch holidays", error);
  }
};

module.exports = {
  getHolidays
};
