# Arogya Patra – AI-Powered Medical Reports Management System

## 1. Project Introduction

Arogya Patra is an AI-powered Medical Reports Management System designed to simplify how patients store, organize, access and understand their medical reports.
Patients often receive medical reports from multiple hospitals, diagnostic centres and laboratories. Keeping track of these reports in physical files or separate digital folders can become difficult over time.
Arogya Patra aims to solve this problem by providing a centralized digital platform where patients can maintain their medical reports and access them whenever required.
The project also explores the integration of Artificial Intelligence and voice technologies to make medical information easier to understand through a conversational AI Health Report Assistant.
Project Goal: To make medical report management more organized, accessible and user-friendly through web technologies, AI and voice-based interaction.

## 2. Problem Statement

Managing medical reports is often inconvenient for patients because:
- Reports are scattered across different hospitals and diagnostic centres.
- Physical reports can be misplaced or damaged.
- Finding an older report can take time.
- Patients may find medical terminology and test results difficult to understand.
- Accessing and reviewing multiple reports can be challenging.
There is a need for a centralized digital solution that simplifies medical report management and helps patients understand the information contained in their reports.

## 3. Proposed Solution

Arogya Patra provides a centralized web-based platform for managing medical reports.
Patients can create an account, log in, upload reports from different hospitals and organize them digitally. The platform provides filtering options to help users find reports based on test names and time periods.
An additional feature is the AI Health Report Assistant. Users can ask questions about their uploaded medical reports, and the AI assistant generates responses based on the available report information.
The project also explores voice-based interaction using Gnani AI speech technologies, aiming to make the platform more accessible to users who prefer speaking rather than typing.

## 4. Main Features

### 4.1 Patient Registration and Login
- Users can create an account using their personal registration details.
- Account creation includes a demo OTP verification flow.
- A unique Arogya Patra ID is generated for each account.
- Users can log in using their Arogya Patra ID.
- Mobile-number-based login is also supported as a recovery option.

### 4.2 Medical Report Upload
- Patients can upload medical reports digitally.
- Supports PDF and image-based report files.
- Users can enter hospital names, doctor details, test names and report dates.
- Multiple report attachments can be grouped under a single report entry.

### 4.3 Hospital-Wise Report Organization
- Reports are organized according to hospitals.
- Patients can access reports associated with different hospitals.
- Each report entry displays relevant details to help users identify it.

### 4.4 Apply Filters
- Users can filter reports based on time periods.
- Available time filters include recent months.
- Users can filter reports according to test names.
- Reports can be viewed across different hospitals based on the selected test.

### 4.5 Report Viewing and Management
- Users can open uploaded medical reports.
- Individual attachments can be accessed.
- Reports can be managed through the application interface.

### 4.6 AI Health Report Assistant
- Provides a conversational interface for asking questions about uploaded medical reports.
- Uses Google Gemini to generate responses based on report information.
- Helps explain medical terms and information in a simpler way.
- Supports a voice-oriented interaction workflow.

### 4.7 Voice-Based Interaction
- Explores speech-to-text conversion for spoken questions.
- Explores text-to-speech generation for spoken responses.
- Aims to support interaction in multiple Indian languages.

## 5. Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Webpage structure |
| CSS | User interface styling |
| JavaScript | Frontend functionality and interactions |
| Node.js | Backend runtime environment |
| Express.js | Server-side application and API handling |
| SQLite | Database management |
| Multer | Medical report file uploads |
| Google Gemini AI | AI-powered report question answering |
| Gnani AI APIs | Speech technology exploration and integration |

## 6. Gnani AI Model Integration

Gnani AI speech technologies are being explored as part of the voice-interaction capabilities of Arogya Patra.
The objective is to allow patients to interact with the AI Health Report Assistant using their voice rather than relying only on text input.

### 6.1 Gnani Prisma – Speech-to-Text

Gnani Prisma speech-to-text technology is being evaluated for converting spoken questions into text.

Proposed workflow:
1. The user asks a question using voice input.
2. Speech is sent to the speech recognition service.
3. The recognized speech is converted into text.
4. The resulting text is used as the question for the AI assistant.

### 6.2 Multilingual Voice Interaction

The project aims to explore support for Indian languages such as:
- Telugu
- Hindi
- English
- Tamil
- Kannada
- Malayalam
- Bengali
- Marathi
- Gujarati
- Punjabi

The objective is to make medical information more accessible to users who are comfortable communicating in their preferred language.

### 6.3 Gnani Timbre – Text-to-Speech

Gnani Timbre text-to-speech technology has been identified for converting AI-generated text responses into spoken audio.

Proposed workflow:
1. The AI assistant generates an answer.
2. The answer is passed to the text-to-speech service.
3. The service generates spoken audio.
4. The user can listen to the response.

Important integration note: The current report-question-answering workflow uses Google Gemini. Gnani Prisma has been explored for speech recognition, while further development and testing are needed to complete and validate the full Gnani speech workflow.

## 7. Application Workflow

1. A patient creates an Arogya Patra account.
2. The patient logs in to the application.
3. Medical reports are uploaded with relevant details.
4. Reports are organized hospital-wise.
5. The patient uses filters to find specific reports.
6. The patient opens a report and accesses the AI Health Report Assistant.
7. The patient asks questions about the uploaded report.
8. The AI assistant generates an explanation based on the report information.
9. Voice-based interaction can be explored for asking questions and listening to responses.

## 8. Future Enhancements

- Complete and validate multilingual speech-to-text and text-to-speech integration.
- Expand support for Indian languages.
- Improve AI responses using more comprehensive medical report extraction.
- Strengthen authentication and data security.
- Improve the user experience across mobile devices.
- Test the application with a wider variety of sample medical reports.

## 9. Project Status and Responsible Use

Arogya Patra is a working project prototype. Its purpose is to organize medical reports and help users understand the information contained in them.
The AI assistant is intended for informational support only. It does not replace qualified healthcare professionals, provide a medical diagnosis or recommend treatment.
Further development, integration and real-world testing are required before considering the platform for production use.


Project Name: Arogya Patra  
Category: Artificial Intelligence | Healthcare Technology | Web Development  
Focus: Medical Report Management, AI-Assisted Understanding and Voice Interaction
