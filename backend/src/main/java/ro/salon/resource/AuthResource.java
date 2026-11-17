package ro.salon.resource;

import io.vertx.core.http.HttpServerRequest;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.AuthDto;
import ro.salon.dto.UserDto;
import ro.salon.security.CurrentUser;
import ro.salon.security.Secured;
import ro.salon.service.AuthService;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Authentication")
public class AuthResource {

    @Inject
    AuthService auth;

    @Inject
    CurrentUser current;

    @Context
    HttpServerRequest request;

    @POST
    @Path("/register")
    @Operation(summary = "Create a client account", description = "Returns a JWT so the user is logged in immediately.")
    @APIResponse(responseCode = "201", description = "Account created")
    @APIResponse(responseCode = "400", description = "Validation error")
    @APIResponse(responseCode = "409", description = "Email already registered")
    public Response register(@Valid AuthDto.RegisterRequest req) {
        return Response.status(Response.Status.CREATED).entity(auth.register(req)).build();
    }

    @POST
    @Path("/login")
    @Operation(summary = "Log in with email and password")
    @APIResponse(responseCode = "200", description = "JWT issued")
    @APIResponse(responseCode = "401", description = "Invalid credentials")
    @APIResponse(responseCode = "429", description = "Too many failed attempts")
    public AuthDto.AuthResponse login(@Valid AuthDto.LoginRequest req) {
        String ip = request != null && request.remoteAddress() != null ? request.remoteAddress().host() : "unknown";
        return auth.login(req, ip);
    }

    @POST
    @Path("/logout")
    @Operation(summary = "Log out", description = "Tokens are stateless; the client discards its token. Endpoint kept for symmetry and future token revocation.")
    public Response logout() {
        return Response.noContent().build();
    }

    @POST
    @Path("/forgot-password")
    @Operation(summary = "Request a password reset link", description = "Always answers 202 so accounts cannot be enumerated.")
    public Response forgotPassword(@Valid AuthDto.ForgotPasswordRequest req) {
        auth.forgotPassword(req.email());
        return Response.accepted().build();
    }

    @POST
    @Path("/reset-password")
    @Operation(summary = "Set a new password using a reset token")
    public Response resetPassword(@Valid AuthDto.ResetPasswordRequest req) {
        auth.resetPassword(req);
        return Response.noContent().build();
    }

    @GET
    @Path("/me")
    @Secured
    @SecurityRequirement(name = "bearerAuth")
    @Transactional
    @Operation(summary = "The authenticated user")
    public UserDto.Detail me() {
        return UserDto.Detail.of(current.user());
    }
}
