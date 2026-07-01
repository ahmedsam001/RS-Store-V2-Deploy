import { Link, useLocation } from 'react-router-dom';
import { PATHS } from '@/shared/constants/routes';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';

export function AdminLoginFallback() {
  const location = useLocation();
  return (
<main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
       <Card className="max-w-md">
         <CardHeader>
           <CardTitle>Admin login required</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4 text-sm text-muted-foreground">
           <p>Sign in as admin or store owner to access the control panel</p>
           <Button asChild className="w-full">
             <Link to={PATHS.adminLogin} state={{ from: location.pathname }}>
               Admin Login
             </Link>
           </Button>
         </CardContent>
       </Card>
     </main>
  );
}
