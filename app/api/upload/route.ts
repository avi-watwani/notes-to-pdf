import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  // --- Authentication Check ---
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdfFile');

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
    return NextResponse.json(
      { message: 'Error uploading file to S3', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
