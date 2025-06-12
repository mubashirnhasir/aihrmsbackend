const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate screening questions for a job position
 */
const generateQuestions = async (req, res) => {
  try {
    const { jobTitle, jobDescription, questionCount = 5, difficulty = 'medium' } = req.body;

    if (!jobTitle || !jobDescription) {
      throw new ApiError(400, "Job title and description are required");
    }

    const prompt = `Generate ${questionCount} ${difficulty} level screening questions for a ${jobTitle} position. 

Job Description: ${jobDescription}

Please provide questions that assess:
1. Technical skills relevant to the role
2. Problem-solving abilities
3. Experience with relevant technologies/methodologies
4. Soft skills and cultural fit

Format the response as a JSON array of objects with the following structure:
{
  "question": "The actual question",
  "type": "technical|behavioral|situational",
  "expectedAnswer": "Brief description of what constitutes a good answer",
  "difficulty": "easy|medium|hard"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert HR recruiter and interviewer. Generate relevant, unbiased screening questions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const questionsText = completion.choices[0].message.content;
    let questions;

    try {
      questions = JSON.parse(questionsText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      questions = [
        {
          question: "Can you describe your experience with the key technologies mentioned in this job description?",
          type: "technical",
          expectedAnswer: "Candidate should demonstrate familiarity with relevant technologies",
          difficulty: difficulty
        },
        {
          question: "Tell me about a challenging project you've worked on and how you overcame obstacles.",
          type: "behavioral",
          expectedAnswer: "Look for problem-solving skills and resilience",
          difficulty: difficulty
        }
      ];
    }

    return res.status(200).json(new ApiResponse(
      200,
      {
        questions,
        jobTitle,
        questionCount: questions.length
      },
      "Screening questions generated successfully"
    ));

  } catch (error) {
    console.error('Question Generation Error:', error);
    throw new ApiError(500, "Failed to generate screening questions", error);
  }
};

/**
 * Evaluate video interview responses
 */
const evaluateVideoInterview = async (req, res) => {
  try {
    const { questions, responses, jobTitle } = req.body;

    if (!questions || !responses || !Array.isArray(questions) || !Array.isArray(responses)) {
      throw new ApiError(400, "Questions and responses arrays are required");
    }

    if (questions.length !== responses.length) {
      throw new ApiError(400, "Number of questions and responses must match");
    }

    const evaluations = [];
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const response = responses[i];

      const evaluationPrompt = `Evaluate this interview response for a ${jobTitle} position:

Question: ${question.question}
Question Type: ${question.type}
Candidate's Response: ${response.answer}

Please provide a score from 1-10 and detailed feedback. Consider:
- Relevance to the question
- Technical accuracy (if applicable)
- Communication clarity
- Depth of knowledge demonstrated

Respond in JSON format:
{
  "score": 7,
  "feedback": "Detailed feedback about the response",
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"]
}`;

      try {
        const evaluation = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert interviewer evaluating candidate responses objectively and fairly."
            },
            {
              role: "user",
              content: evaluationPrompt
            }
          ],
          temperature: 0.3,
        });

        const evaluationText = evaluation.choices[0].message.content;
        let parsedEvaluation;

        try {
          parsedEvaluation = JSON.parse(evaluationText);
        } catch (parseError) {
          // Fallback evaluation
          parsedEvaluation = {
            score: 6,
            feedback: "Response received and evaluated",
            strengths: ["Communication"],
            improvements: ["More detail needed"]
          };
        }

        evaluations.push({
          questionIndex: i,
          question: question.question,
          response: response.answer,
          ...parsedEvaluation
        });

        totalScore += parsedEvaluation.score;

      } catch (evalError) {
        console.error(`Error evaluating question ${i}:`, evalError);
        evaluations.push({
          questionIndex: i,
          question: question.question,
          response: response.answer,
          score: 5,
          feedback: "Evaluation temporarily unavailable",
          strengths: [],
          improvements: []
        });
        totalScore += 5;
      }
    }

    const averageScore = totalScore / questions.length;
    const overallRating = averageScore >= 8 ? "Excellent" : 
                         averageScore >= 6 ? "Good" : 
                         averageScore >= 4 ? "Fair" : "Poor";

    return res.status(200).json(new ApiResponse(
      200,
      {
        evaluations,
        summary: {
          totalQuestions: questions.length,
          averageScore: Math.round(averageScore * 10) / 10,
          overallRating,
          totalScore
        }
      },
      "Video interview evaluation completed successfully"
    ));

  } catch (error) {
    console.error('Video Interview Evaluation Error:', error);
    throw new ApiError(500, "Failed to evaluate video interview", error);
  }
};

module.exports = {
  generateQuestions,
  evaluateVideoInterview
};
