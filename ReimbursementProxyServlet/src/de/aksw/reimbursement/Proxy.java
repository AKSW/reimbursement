package de.aksw.reimbursement;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.InvalidParameterException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.codec.binary.Base64;

import com.gargoylesoftware.htmlunit.ElementNotFoundException;
import com.gargoylesoftware.htmlunit.FailingHttpStatusCodeException;
import com.gargoylesoftware.htmlunit.WebClient;
import com.gargoylesoftware.htmlunit.html.HtmlAnchor;
import com.gargoylesoftware.htmlunit.html.HtmlCheckBoxInput;
import com.gargoylesoftware.htmlunit.html.HtmlFileInput;
import com.gargoylesoftware.htmlunit.html.HtmlForm;
import com.gargoylesoftware.htmlunit.html.HtmlPage;
import com.gargoylesoftware.htmlunit.html.HtmlSubmitInput;

/**
 * Servlet implementation class HelloWorldServlet
 */
public class Proxy extends HttpServlet {
	private static final long serialVersionUID = 1L;
	static String errors = "";
       
    /**
     * @see HttpServlet#HttpServlet()
     */
    public Proxy() {
        super();
        // TODO Auto-generated constructor stub
    }

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		PrintWriter writer = response.getWriter();
		
		System.err.println(getDate()+" called DoGet()\n");
		mylog("called DoGet()");
		
		writer.println("<html>");
		writer.println("<head><title>Reimbursement</title></head>");
		writer.println("<body>");
		writer.println("	<pre>");
		writer.println(errors);	
		writer.println("<body>");
		writer.println("</html>");
			
		writer.close();	
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
/*	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// TODO Auto-generated method stub
		super.doPost(request, response);
	}*/
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		errors=""; //clean the errors log
		response.getOutputStream();
	
		try (final WebClient webClient = new WebClient()) {
			String uploadURL ="", confirmBoxName ="", pdfDownloadLinkName ="";
			
			webClient.getOptions().setThrowExceptionOnScriptError(false); //ignore javascript errors in htmlunit
			
			mylog("Content-Type of the request: "+request.getHeader("Content-Type"));
			
			Path xml = Files.createTempFile("RKA-xml-temp-file", "xml"); // create a temp file for the uploaded xml
			String reimbursementType = processMultiPartRequest(request, xml); //parse the http request
			
			mylog("Requested mode of reimbursement: "+reimbursementType);
			
			if (reimbursementType.startsWith("dienstreiseantrag"))
			{
				uploadURL = "https://service.uni-leipzig.de/pvz/dienstreiseantrag/uploadxml";
				confirmBoxName = "dienstreiseantrag[bestaetigung]";
				pdfDownloadLinkName= "» Download Dienstreiseantrag «";
			}  
			else if (reimbursementType.startsWith("reisekostenabrechnung"))
			{
				uploadURL = "https://service.uni-leipzig.de/pvz/reisekostenabrechnung/uploadxml";
				confirmBoxName = "reisekostenabrechnung[bestaetigung]";
				pdfDownloadLinkName= "» Download Reisekostenabrechnung «";
			}
			else if (reimbursementType.startsWith("xmldownload"))
			{
				response.setContentType("application/xml");
		        response.setHeader("Content-Disposition", "filename=\"dings.xml\"");
		        //response.setHeader("RKA-debug", errors);
		        IOUtils.copy(Files.newInputStream(xml), response.getOutputStream());
			}
			else
			{
				throw new InvalidParameterException("The requested reimbursement mode '"+reimbursementType+"' is not supported");
			}
			
			if (!reimbursementType.startsWith("xmldownload"))
			{

			// rename the temporary file to a .xml file (so append the suffix); this needs to be done for htmlunit or the university service (probably because of mime type???)
			String s = xml.getFileName().toString()+".xml";	
			Path xml2 = xml.getParent().resolve(s);
			Files.move(xml, xml2, StandardCopyOption.REPLACE_EXISTING);
			mylog("xml file stored in "+xml2.toString());
			
	        // Get the reimbursement page 
			final HtmlPage uploadPage = webClient.getPage(uploadURL);

	        // Get the xml file upload form
	        final HtmlForm fileForm = uploadPage.getForms().get(1);
	        // find the submit button and the file path field
	        final HtmlSubmitInput button = fileForm.getInputByName("save");
	        final HtmlFileInput fileInput = fileForm.getInputByName("file");
	        // set the file path of the xml 
	        fileInput.setValueAttribute(xml2.toAbsolutePath().toString());
	        //fileInput.setContentType("application/pdf");

	        // Now submit the form by clicking the button and get back the reimbursement form page
	        final HtmlPage formPage = button.click();
	          //System.out.println(formPage.asXml());
	        //mylog(xml.toAbsolutePath().toString());
	        //mylog(formPage.asText());
	        
	        // Get the actual reimbursement form, get the submit button, get and tick the "confirm" box
	        final HtmlForm form = formPage.getFormByName("sf_admin_edit_form");
	        final HtmlSubmitInput button2 = form.getInputByName("save");
	        final HtmlCheckBoxInput box = form.getInputByName(confirmBoxName);
	        box.setChecked(true);
	        
	        // submit form
	        HtmlPage downloadSite = button2.click();
	        
	        //resubmit form because of an university service bug but just for reisekostenantrag
	        if(!reimbursementType.equalsIgnoreCase("dienstreiseantrag"))
	        {
	        	final HtmlForm form2 = downloadSite.getFormByName("sf_admin_edit_form");
		        final HtmlSubmitInput button3 = form2.getInputByName("save");
		        downloadSite = button3.click();
	        }
	        
	        System.out.println(formPage.asXml());
	        
	        // get the pdf download link
	        HtmlAnchor pdfURL = downloadSite.getAnchorByText(pdfDownloadLinkName);
	       
	        // download the pdf using the download link
	        InputStream in = pdfURL.click().getWebResponse().getContentAsStream();
	        
	        // set the headers and the pdf as playload for the http response
	        response.setContentType("application/pdf");
	        response.setHeader("Content-Disposition", "filename=\"dings.pdf\"");
	        //response.setHeader("RKA-debug", errors);
	        IOUtils.copy(in, response.getOutputStream());
	        
			}
	        
	    } catch (FailingHttpStatusCodeException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			mylog("Probably something went wrong with downloading the pdf from university service. See stacktrace below:");
			mylog(e.getClass()+": "+e.getMessage()+"\n\t"+Arrays.toString(e.getStackTrace()));
			response.setHeader("RKA-status", "Error");
		} catch (MalformedURLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			mylog(e.getClass()+": "+e.getMessage()+"\n\t"+Arrays.toString(e.getStackTrace()));
			response.setHeader("RKA-status", "Error");
		} catch (ElementNotFoundException e) {
			// TODO Auto-generated catch block
			mylog("There is a problem with your xml file. Check it manually against https://service.uni-leipzig.de/pvz/reisekostenabrechnung to see what the problem is.");
			e.printStackTrace();
			mylog(e.getClass()+": "+e.getMessage()+"\n\t"+Arrays.toString(e.getStackTrace()));
			response.setHeader("RKA-status", "Error");
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
			mylog(e.getClass()+": "+e.getMessage()+"\n\t"+Arrays.toString(e.getStackTrace()));
			response.setHeader("RKA-status", "Error");
	    } finally
		{
	    	Base64 b64 = new Base64();
			response.setHeader("RKA-debug", b64.encodeAsString(errors.getBytes("UTF-8")));
			System.out.println(errors);
		}
		

	}
	
	protected String processMultiPartRequest(HttpServletRequest request, Path xml) throws ServletException
	{
		String reimbursementType = "";
		String xmlUrl = "";
		try {
			
	        List<FileItem> items = new ServletFileUpload(new DiskFileItemFactory()).parseRequest(request);
	        for (FileItem item : items) {
	            if (item.isFormField()) {
	                // Process regular form field --> reimbursement-type parameter or xml-url parameter
	               if (item.getFieldName().equals("reimbursement-type"))
	                	reimbursementType = item.getString();
	               if (item.getFieldName().equals("xml-url"))
	            	   xmlUrl = item.getString();
	            } else 
	            {
	                // Process form file field (input type="file") --> thus the uploaded xml file or nothing if it's a xmldownload request
	            		
	            	if (!reimbursementType.equals("xmldownload"))
	            	{
		                //String fieldName = item.getFieldName();
		                //String fileName = FilenameUtils.getName(item.getName());
		                InputStream fileContent = item.getInputStream();
		                
		                // read the submitted xml file and store it as local temporary file
		    			Long bytes = Files.copy(fileContent, xml, StandardCopyOption.REPLACE_EXISTING);
		    			
		    			//mylog(bytes.toString()+" "+xml.toAbsolutePath().toString()+" "+Arrays.toString(Files.readAllLines(xml, StandardCharsets.UTF_8).toArray()));
		    			mylog("read "+bytes.toString()+" bytes of the xml file");
	            	}
	            }
	        }
	        if (reimbursementType.equals("xmldownload"));
	        {
	        	try {
					FileUtils.copyURLToFile(new URL(xmlUrl),xml.toFile(),10000,20000);
					mylog("xml downloaded to "+xml.toFile().getAbsolutePath().toString()+" in "+xml.toFile().length()+" bytes.");
				} catch (MalformedURLException e) {
					throw new ServletException("No valid URL was given for xmldownload mode: "+e.getMessage(), e);
				} catch (java.io.FileNotFoundException e) {
					throw new ServletException("Could not access the given URL for xmldownload mode: "+e.getMessage(), e);
				} catch (IOException e) {
					// TODO Auto-generated catch block
					throw new ServletException("Some IO-Error occured in xmldownload mode: "+e.getMessage(), e);
				}
	        }
	    } catch (FileUploadException e) {
	        throw new ServletException("Cannot parse multipart request: "+e.getMessage(), e);
	        
	    } catch (IOException e) {
			// TODO Auto-generated catch block
	    	throw new ServletException("An IO-Error occured while parsing the POST request: "+e.getMessage(), e);
		}
		return reimbursementType;
	}
	
	protected String getDate()
	{
		DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
		Date date = new Date();
		return dateFormat.format(date);
	}
	
	protected void mylog(String message)
	{
		errors+="\n"+getDate()+" "+message;
	}

}
