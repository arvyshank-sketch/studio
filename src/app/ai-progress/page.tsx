
'use client';

import { useState, useRef, useEffect } from 'react';
import withAuth from '@/components/with-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Camera, Upload, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import SafeImage from '@/components/SafeImage';

function AIProgressPage() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
    
    return () => {
        // Stop camera stream when component unmounts
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, [toast]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg');
      setPhotoDataUri(dataUri);
    }
  };

  const handleAnalyze = async () => {
    if (!photoDataUri) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    // Placeholder for actual AI analysis call
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      variant: 'destructive',
      title: 'Feature Disabled',
      description: 'AI analysis requires a billing account to be enabled. This feature is currently disabled.',
    });
    
    setIsAnalyzing(false);
  };
  
  const resetPhoto = () => {
    setPhotoDataUri(null);
    setAnalysisResult(null);
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          AI Progress Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload a photo to get an AI-powered analysis of your physical changes.
        </p>
      </header>
      
      <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Billing Required</AlertTitle>
          <AlertDescription>
            This feature uses Google AI services and requires a billing account to be enabled on your project for production use. It is currently disabled.
          </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Photo Upload</CardTitle>
          <CardDescription>
            {photoDataUri ? 'Review your photo or retake it.' : 'Capture a photo using your camera.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {photoDataUri ? (
              <SafeImage src={photoDataUri} alt="User photo" width={600} height={400} className="object-contain" />
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {hasCameraPermission === false && (
            <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>Please enable camera permissions in your browser settings to use this feature.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 justify-center">
            {photoDataUri ? (
                <>
                    <Button onClick={resetPhoto} variant="outline">Retake Photo</Button>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                      Analyze
                    </Button>
                </>
            ) : (
                <Button onClick={takePhoto} disabled={hasCameraPermission !== true}>
                  <Camera className="mr-2" />
                  Take Photo
                </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(AIProgressPage);
