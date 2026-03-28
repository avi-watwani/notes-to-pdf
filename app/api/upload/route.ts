import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    
    let uid: string;
    try {
      const auth = getAdminAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (err) {
      console.error('Token verification failed:', err);
      return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ message: 'User profile not found. Please complete signup.' }, { status: 403 });
    }

    const userData = userDoc.data();
    if (!userData?.awsAccessKeyId || !userData?.awsSecretAccessKey || !userData?.awsRegion || !userData?.s3BucketName) {
      return NextResponse.json({ message: 'AWS configuration incomplete. Please update your settings.' }, { status: 403 });
    }

    const formData = await request.formData();
    const pdfFile = formData.get('pdfFile');

    if (!pdfFile) {
      return NextResponse.json({ message: 'No PDF file found in form data' }, { status: 400 });
    }

    if (!(pdfFile instanceof File)) {
      return NextResponse.json({ message: 'Uploaded data is not a file' }, { status: 400 });
    }

    if (!pdfFile.type.startsWith('application/pdf')) {
      return NextResponse.json({ message: 'Uploaded file is not a PDF' }, { status: 400 });
    }

    const maxSizeInBytes = 10 * 1024 * 1024;
    if (pdfFile.size > maxSizeInBytes) {
      return NextResponse.json({ message: 'Uploaded file is too large' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const clientDate = formData.get('date');
    let year, month, dayMonthYear;
    if (typeof clientDate === 'string' && /^\d{2} [A-Za-z]+ \d{4}$/.test(clientDate)) {
      try {
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

    const s3Client = new S3Client({
      region: userData.awsRegion,
      credentials: {
        accessKeyId: userData.awsAccessKeyId,
        secretAccessKey: userData.awsSecretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: userData.s3BucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: pdfFile.type || 'application/pdf',
    });

    await s3Client.send(command);

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
