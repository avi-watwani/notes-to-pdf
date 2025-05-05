import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { format } from 'date-fns';

// Initialize S3 client (can be outside the handler)
const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Export the named function for the POST method
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const pdfFile = formData.get('pdfFile'); // Use the key you set in the frontend FormData

        // --- Validation ---
        if (!pdfFile) {
            return NextResponse.json({ message: 'No PDF file found in form data' }, { status: 400 });
        }

        // Ensure it's a File object (formData can hold strings too)
        if (!(pdfFile instanceof File)) {
             return NextResponse.json({ message: 'Uploaded data is not a file' }, { status: 400 });
        }

        // Check file type (optional, but good for security)
        if (!pdfFile.type.startsWith('application/pdf')) {
            return NextResponse.json({ message: 'Uploaded file is not a PDF' }, { status: 400 });
        }

        // Check file size (optional, adjust the limit as needed)
        const maxSizeInBytes = 2 * 1024 * 1024; // 2 MB
        if (pdfFile.size > maxSizeInBytes) {
            return NextResponse.json({ message: 'Uploaded file is too large' }, { status: 400 });
        }

        // --- Get File Content ---
        // Convert the File blob into an ArrayBuffer, then into a Buffer the SDK understands
        const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());

        // --- S3 Logic ---
        // Generate S3 key based on current date on the server
        const now = new Date();
        const year = format(now, 'yyyy');
        const month = format(now, 'MMM'); // e.g., May
        const dayMonthYear = format(now, 'dd MMM yyyy'); // e.g., 05 May 2025
        const s3Key = `${year}/${month}/${dayMonthYear}.pdf`;

        const bucketName = process.env.S3_BUCKET_NAME;

        if (!bucketName) {
            console.error("S3_BUCKET_NAME environment variable is not set.");
            return NextResponse.json({ message: 'Server configuration error: Bucket name missing.' }, { status: 500 });
        }

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: pdfFile.type || 'application/pdf', // Use file's content type or default to PDF
            // ACL: 'private', // Or 'public-read' if needed, adjust bucket policy accordingly
        });

        await s3Client.send(command);

        // --- Success Response ---
        return NextResponse.json(
            { message: 'File uploaded successfully', key: s3Key },
            { status: 200 }
        );

    } catch (error) {
        console.error('API Upload Error:', error);
         // Consider more specific error checking if needed
        return NextResponse.json(
            { message: 'Error uploading file to S3', error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
