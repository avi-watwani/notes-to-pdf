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
    const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB (increased for image-based PDFs with emojis)
    if (pdfFile.size > maxSizeInBytes) {
      return NextResponse.json({ message: 'Uploaded file is too large' }, { status: 400 });
    }

    // --- Get File Content ---
    // Convert the File blob into an ArrayBuffer, then into a Buffer the SDK understands
    const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());

    // --- S3 Logic ---
    // Use client-provided date if available and valid, else fallback to server date
    const clientDate = formData.get('date');
    let year, month, dayMonthYear;
    if (typeof clientDate === 'string' && /^\d{2} [A-Za-z]+ \d{4}$/.test(clientDate)) {
      // Try to parse the client date string (format: dd MMMM yyyy)
      try {
        // Parse using toLocaleDateString for full month name
        const [day, monthName, yearStr] = clientDate.split(' ');
        const monthIndex = [
          'January','February','March','April','May','June','July','August','September','October','November','December'
        ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
        if (monthIndex === -1) throw new Error('Invalid month');
        const parsed = new Date(Number(yearStr), monthIndex, Number(day));
        if (!isNaN(parsed.getTime())) {
          year = format(parsed, 'yyyy');
          month = format(parsed, 'MMMM');
          dayMonthYear = format(parsed, 'dd MMMM yyyy');
        } else {
          throw new Error('Invalid date');
        }
      } catch {
        return NextResponse.json({ message: 'Invalid date format. Please use dd MMMM yyyy.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: 'Invalid date format. Please use dd MMMM yyyy.' }, { status: 400 });
    }
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
