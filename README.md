# Document-Based-QA-system

This is a document based quation answering system build in nextjs.
How does this work :

 -- Firstly user will upload a docuemnt.
 -- Then that document is broken down into chunks 
 -- Then i have used a Sentence transformer from HugginFace which all All-MiniLm.
 -- This converts the document chunks into the vector embedding which are then stored in pinecone database.
 -- So now whenever user makes a query first these are conevrted into the vector embedding using the above model and The relevant chunks of document are fetched from the database using the cosine similarity.
 -- After fetching the relevant chunks and having the user query these are sent to  google Gemini to create a response based on the user query and the relevant chunks.
 -- I have implemented a Chat based system that help user to ask the quetion based on the previous queries .
 -- Powered with authentication and authorization.
