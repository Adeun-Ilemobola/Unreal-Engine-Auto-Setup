using System;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Runtime.InteropServices;
using System.Text;
class TreeFixture {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SI {public int cb; public string a,b,c;public int d,e,f,g,h,i,j,k;public short l,m;public IntPtr n,o,p,q;}
 [StructLayout(LayoutKind.Sequential)] struct PI {public IntPtr process,thread;public int pid,tid;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SI si,out PI pi);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr h);
 static int Main(string[] args) {
  if(args.Length!=3)return 2;
  if(args[0]=="breakaway") {
   var exe=Process.GetCurrentProcess().MainModule.FileName;var si=new SI{cb=Marshal.SizeOf(typeof(SI))};PI child;
   bool escaped=CreateProcess(exe,new StringBuilder("\""+exe+"\" child \""+args[1]+"\" \""+args[2]+"\""),IntPtr.Zero,IntPtr.Zero,false,0x09000000,IntPtr.Zero,null,ref si,out child);
   if(escaped){CloseHandle(child.thread);CloseHandle(child.process);return 3;}
   return Marshal.GetLastWin32Error()==5?0:4;
  }
  if(args[0]=="root") {
   var start=new ProcessStartInfo(Process.GetCurrentProcess().MainModule.FileName,"child \""+args[1]+"\" \""+args[2]+"\"");
   start.UseShellExecute=false;start.CreateNoWindow=true;Process.Start(start);return 0;
  }
  File.WriteAllText(args[2],Process.GetCurrentProcess().Id.ToString());
  var deadline=DateTime.UtcNow.AddSeconds(30);
  while(!File.Exists(args[1]) && DateTime.UtcNow<deadline)Thread.Sleep(25);
  return 0;
 }
}
